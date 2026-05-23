package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

type proc struct {
	cmd  *exec.Cmd
	name string
}

var running []*proc

func main() {
	useWorkers := len(os.Args) > 1 && os.Args[1] == "worker"
	if useWorkers {
		setDefaultEnv("PORTAL_EMAIL_PRODUCER_ENABLED", "true")
		setDefaultEnv("PORTAL_EMAIL_PRODUCER_URL", "http://localhost:8787")
		setDefaultEnv("PORTAL_EMAIL_PRODUCER_TOKEN", "dev-token")
	}

	projectDir, err := findProjectRoot()
	if err != nil {
		log.Fatal(err)
	}

	backendDir := filepath.Join(projectDir, "backend")
	frontendDir := filepath.Join(projectDir, "frontend")
	emailDir := filepath.Join(projectDir, "packages", "email")

	loadDotEnv(filepath.Join(projectDir, ".env"))

	composeFile := filepath.Join(projectDir, "docker-compose.postgres.yml")

	// 1. Reset DB
	log.Println("Resetting database...")
	run("docker", "compose", "-f", composeFile, "down", "-v")
	run("docker", "compose", "-f", composeFile, "up", "-d", "postgres")

	// 2. Wait for PostgreSQL to be healthy
	log.Println("Waiting for PostgreSQL to be ready...")
	waitForPostgres(composeFile)

	// 3. Migrate
	log.Println("Running migrations...")
	runInDir(backendDir, "go", "run", "./scripts/migrate/main.go")

	// 4. Seed
	log.Println("Running seed...")
	runInDir(backendDir, "go", "run", "./scripts/seed/main.go")

	// 5. Start backend API
	log.Println("Starting backend API (air)...")
	startProcess(backendDir, "air", "-c", ".air.toml")

	// 6. Start frontend (Vite dev server)
	log.Println("Starting frontend (Vite dev server)...")
	startProcess(frontendDir, "pnpm", "run", "dev", "--", "--host", "127.0.0.1")

	// 7. Start email workers (optional)
	if useWorkers {
		log.Println("Starting email workers (local-stack)...")
		startProcess(emailDir, "pnpm", "run", "dev:local-stack")
	}

	// Wait for signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	log.Println("All services started. Press Ctrl+C to stop.")
	<-sigCh

	log.Println("\nShutting down...")
	cleanup()
	log.Println("Done.")
}

func setDefaultEnv(key string, value string) {
	if strings.TrimSpace(os.Getenv(key)) == "" {
		os.Setenv(key, value)
	}
}

// loadDotEnv reads KEY=VALUE pairs from path and sets them via setDefaultEnv
// so that existing shell environment variables take precedence.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return // .env is optional
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		setDefaultEnv(strings.TrimSpace(key), strings.TrimSpace(value))
	}
}

func findProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir, err = filepath.Abs(dir)
	if err != nil {
		return "", err
	}

	markers := []string{"mise.toml", "docker-compose.postgres.yml", ".git"}
	for {
		for _, marker := range markers {
			if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
				return dir, nil
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("project root not found (no mise.toml or .git found)")
		}
		dir = parent
	}
}

func waitForPostgres(composeFile string) {
	for i := 0; i < 60; i++ {
		cmd := exec.Command("docker",
			"compose", "-f", composeFile,
			"exec", "-T", "postgres",
			"pg_isready", "-U", "portaldots", "-d", "portaldots_rebuild",
		)
		output, err := cmd.CombinedOutput()
		if err == nil && strings.Contains(string(output), "accepting connections") {
			log.Println("PostgreSQL is ready.")
			return
		}
		time.Sleep(2 * time.Second)
	}
	log.Fatal("Timed out waiting for PostgreSQL")
}

func run(name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("Command failed: %s %v: %v", name, args, err)
	}
}

func runInDir(dir, name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("Command failed in %s: %s %v: %v", dir, name, args, err)
	}
}

func startProcess(dir, name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		log.Printf("Failed to start %s: %v", name, err)
		return
	}

	p := &proc{cmd: cmd, name: name}
	running = append(running, p)

	go func() {
		if err := cmd.Wait(); err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				if status, ok := exitErr.Sys().(syscall.WaitStatus); ok {
					if status.Signal() == syscall.SIGTERM || status.Signal() == syscall.SIGKILL {
						return
					}
				}
			}
			log.Printf("[%s] exited: %v", name, err)
		}
	}()
}

func cleanup() {
	for _, p := range running {
		if p.cmd.Process != nil {
			log.Printf("Stopping %s (pid %d)...", p.name, p.cmd.Process.Pid)
			syscall.Kill(-p.cmd.Process.Pid, syscall.SIGTERM)
		}
	}

	done := make(chan struct{})
	go func() {
		for _, p := range running {
			p.cmd.Wait()
		}
		close(done)
	}()

	select {
	case <-done:
		log.Println("All processes stopped.")
	case <-time.After(10 * time.Second):
		log.Println("Force killing remaining processes...")
		for _, p := range running {
			if p.cmd.Process != nil {
				syscall.Kill(-p.cmd.Process.Pid, syscall.SIGKILL)
			}
		}
	}
}
