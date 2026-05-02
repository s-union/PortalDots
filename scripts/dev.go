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

func main() {
	rootDir, err := findRepoRoot()
	if err != nil {
		log.Fatal(err)
	}

	if err := run(rootDir); err != nil {
		log.Fatal(err)
	}
}

func run(rootDir string) error {
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

	if err := runCommand(rootDir, "mise", "run", "backend-migrate"); err != nil {
		return err
	}
	if err := runCommand(rootDir, "mise", "run", "backend-seed"); err != nil {
		return err
	}

	commands := []*managedCommand{
		newManagedCommand("backend", rootDir, "mise", "run", "backend-dev"),
		newManagedCommand("frontend", rootDir, "mise", "run", "frontend-dev"),
		newManagedCommand("email-producer", rootDir, "mise", "run", "email-producer-dev"),
		newManagedCommand("email-consumer-high", rootDir, "mise", "run", "email-consumer-dev-high"),
		newManagedCommand("email-consumer-normal", rootDir, "mise", "run", "email-consumer-dev-normal"),
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
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = dir
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

func commandOutput(dir string, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}
