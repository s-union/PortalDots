package main

import (
	"errors"
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

type managedCommand struct {
	name string
	cmd  *exec.Cmd
}

type processExit struct {
	name string
	err  error
}

type devMode string

const (
	devModeMock   devMode = "mock"
	devModeWorker devMode = "worker"
)

func main() {
	rootDir, err := findRepoRoot()
	if err != nil {
		log.Fatal(err)
	}

	mode, err := parseDevMode(os.Args[1:])
	if err != nil {
		log.Fatal(err)
	}

	if err := run(rootDir, mode); err != nil {
		log.Fatal(err)
	}
}

func run(rootDir string, mode devMode) error {
	composeFile := filepath.Join(rootDir, "docker-compose.postgres.yml")

	if err := resetDatabase(rootDir, composeFile); err != nil {
		return err
	}
	if err := runCommand(rootDir, "docker", "compose", "-f", composeFile, "up", "-d", "postgres"); err != nil {
		return err
	}
	defer shutdownDatabase(rootDir, composeFile)

	if err := waitForComposeService(rootDir, composeFile, "postgres", 30*time.Second); err != nil {
		return err
	}

	databaseURL, err := loadEnvVar(rootDir, ".env", "PORTAL_DATABASE_URL")
	if err != nil {
		return err
	}
	if strings.TrimSpace(databaseURL) == "" {
		return fmt.Errorf("PORTAL_DATABASE_URL not found in .env")
	}

	databaseEnv := []string{"PORTAL_DATABASE_URL=" + databaseURL}
	if err := runCommandWithEnv(rootDir, databaseEnv, "mise", "run", "backend-migrate"); err != nil {
		return err
	}
	if err := runCommandWithEnv(rootDir, databaseEnv, "mise", "run", "backend-seed"); err != nil {
		return err
	}

	backendEnv := append(databaseEnv, emailEnv(mode)...)
	commands := []*managedCommand{
		newManagedCommandWithEnv("backend", rootDir, backendEnv, "mise", "run", "backend-dev"),
		newManagedCommand("frontend", rootDir, "mise", "run", "frontend-dev"),
	}
	if mode == devModeWorker {
		commands = append(commands, newManagedCommand("email-workers", rootDir, "mise", "run", "email-workers-dev"))
	}

	started, err := startCommands(commands)
	if err != nil {
		stopCommands(commands)
		return err
	}
	defer stopCommands(started)

	signalCh := make(chan os.Signal, 1)
	signal.Notify(signalCh, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signalCh)

	exitCh := make(chan processExit, len(started))
	for _, command := range started {
		go func(command *managedCommand) {
			exitCh <- processExit{name: command.name, err: command.cmd.Wait()}
		}(command)
	}

	select {
	case sig := <-signalCh:
		log.Printf("received %s, shutting down", sig)
		return nil
	case result := <-exitCh:
		if result.err == nil {
			return fmt.Errorf("%s exited", result.name)
		}
		return fmt.Errorf("%s failed: %w", result.name, result.err)
	}
}

func parseDevMode(args []string) (devMode, error) {
	if len(args) == 0 {
		return devModeMock, nil
	}
	if len(args) > 1 {
		return "", fmt.Errorf("usage: dev [mock|worker]")
	}

	switch args[0] {
	case "mock":
		return devModeMock, nil
	case "worker":
		return devModeWorker, nil
	default:
		return "", fmt.Errorf("usage: dev [mock|worker]")
	}
}

func emailEnv(mode devMode) []string {
	if mode == devModeWorker {
		return []string{
			"PORTAL_EMAIL_PRODUCER_URL=http://localhost:8787",
			"PORTAL_EMAIL_PRODUCER_ENABLED=true",
			"PORTAL_EMAIL_PRODUCER_TOKEN=dev-token",
		}
	}

	return []string{
		"PORTAL_EMAIL_PRODUCER_URL=",
		"PORTAL_EMAIL_PRODUCER_ENABLED=false",
		"PORTAL_EMAIL_PRODUCER_TOKEN=",
	}
}

func findRepoRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if fileExists(filepath.Join(dir, "mise.toml")) && fileExists(filepath.Join(dir, "docker-compose.postgres.yml")) {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("repository root not found from %s", dir)
		}
		dir = parent
	}
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func waitForComposeService(rootDir string, composeFile string, service string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		containerID, err := commandOutput(rootDir, "docker", "compose", "-f", composeFile, "ps", "-q", service)
		if err != nil {
			return err
		}

		trimmedID := strings.TrimSpace(containerID)
		if trimmedID != "" {
			status, err := commandOutput(rootDir, "docker", "inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", trimmedID)
			if err == nil {
				trimmedStatus := strings.TrimSpace(status)
				if trimmedStatus == "healthy" || trimmedStatus == "running" {
					return nil
				}
			}
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for %s to become healthy", service)
		}

		time.Sleep(time.Second)
	}
}

func newManagedCommand(name string, dir string, args ...string) *managedCommand {
	return newManagedCommandWithEnv(name, dir, nil, args...)
}

func newManagedCommandWithEnv(name string, dir string, env []string, args ...string) *managedCommand {
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = dir
	if len(env) > 0 {
		cmd.Env = append(os.Environ(), env...)
	}
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	return &managedCommand{name: name, cmd: cmd}
}

func startCommands(commands []*managedCommand) ([]*managedCommand, error) {
	started := make([]*managedCommand, 0, len(commands))
	for _, command := range commands {
		if err := command.cmd.Start(); err != nil {
			return started, fmt.Errorf("start %s: %w", command.name, err)
		}
		started = append(started, command)
	}

	return started, nil
}

func stopCommands(commands []*managedCommand) {
	for index := len(commands) - 1; index >= 0; index-- {
		command := commands[index]
		if err := terminateCommand(command.cmd); err != nil {
			log.Printf("stop %s: %v", command.name, err)
		}
	}
}

func terminateCommand(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}

	processGroupID := -cmd.Process.Pid
	if err := syscall.Kill(processGroupID, syscall.SIGTERM); err != nil && !errors.Is(err, syscall.ESRCH) {
		return err
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		err := syscall.Kill(processGroupID, 0)
		if err != nil {
			if errors.Is(err, syscall.ESRCH) {
				return nil
			}
			return err
		}
		time.Sleep(100 * time.Millisecond)
	}

	if err := syscall.Kill(processGroupID, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
		return err
	}

	return nil
}

func shutdownDatabase(rootDir string, composeFile string) {
	if err := runCommand(rootDir, "docker", "compose", "-f", composeFile, "down"); err != nil {
		log.Printf("db-down failed: %v", err)
	}
}

func resetDatabase(rootDir string, composeFile string) error {
	return runCommand(rootDir, "docker", "compose", "-f", composeFile, "down", "-v")
}

func runCommand(dir string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runCommandWithEnv(dir string, env []string, name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), env...)
	return cmd.Run()
}

func loadEnvVar(dir string, filename string, key string) (string, error) {
	path := filepath.Join(dir, filename)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}

	prefix := key + "="
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}
		if strings.HasPrefix(line, prefix) {
			value := strings.TrimPrefix(line, prefix)
			value = strings.Trim(value, "\"'")
			return value, nil
		}
	}
	return "", nil
}

func commandOutput(dir string, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}
