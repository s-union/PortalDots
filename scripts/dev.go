package main

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"sort"
	"strconv"
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

	if err := checkRequiredPorts(rootDir, mode); err != nil {
		return err
	}

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

	databaseURL, err := loadEnvValue(rootDir, "PORTAL_DATABASE_URL")
	if err != nil {
		return err
	}
	if strings.TrimSpace(databaseURL) == "" {
		return fmt.Errorf("PORTAL_DATABASE_URL not found in .env")
	}

	fileEnv, err := loadEnvFile(rootDir, ".env")
	if err != nil {
		return err
	}

	databaseEnv := mergeEnv(fileEnv, []string{"PORTAL_DATABASE_URL=" + databaseURL})
	if err := runCommandWithEnv(rootDir, databaseEnv, "mise", "run", "backend:migrate"); err != nil {
		return err
	}
	if err := runCommandWithEnv(rootDir, databaseEnv, "mise", "run", "backend:seed"); err != nil {
		return err
	}

	backendEnv := mergeEnv(databaseEnv, emailEnv(mode))
	commands := []*managedCommand{
		newManagedCommandWithEnv("backend", filepath.Join(rootDir, "backend"), backendEnv, "air", "-c", ".air.toml"),
		newManagedCommand("frontend", rootDir, "mise", "run", "frontend:dev"),
	}
	if mode == devModeWorker {
		commands = append(commands, newManagedCommand("email", rootDir, "mise", "run", "email:dev"))
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

func checkRequiredPorts(rootDir string, mode devMode) error {
	apiBind, err := loadEnvValue(rootDir, "PORTAL_API_BIND")
	if err != nil {
		return err
	}
	if strings.TrimSpace(apiBind) == "" {
		apiBind = ":8081"
	}

	ports := []requiredPort{
		{name: "backend API", address: normalizeListenAddress(apiBind)},
		{name: "frontend Vite", address: "127.0.0.1:5173"},
	}
	if mode == devModeWorker {
		ports = append(ports,
			requiredPort{name: "email Worker", address: "127.0.0.1:8787"},
			requiredPort{name: "Wrangler inspector", address: "127.0.0.1:9229"},
		)
	}

	var busy []string
	for _, port := range ports {
		if err := assertPortAvailable(port.address); err != nil {
			busy = append(busy, fmt.Sprintf("%s (%s)", port.name, port.address))
		}
	}
	if len(busy) > 0 {
		return fmt.Errorf("required dev port(s) already in use: %s. Stop the existing process or change the configured port before starting dev", strings.Join(busy, ", "))
	}

	return nil
}

type requiredPort struct {
	name    string
	address string
}

func normalizeListenAddress(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "127.0.0.1:8081"
	}
	if strings.HasPrefix(value, ":") {
		return "127.0.0.1" + value
	}
	host, port, err := net.SplitHostPort(value)
	if err != nil {
		return value
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	return net.JoinHostPort(host, port)
}

func assertPortAvailable(address string) error {
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return err
	}
	return listener.Close()
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

	processGroupIDs := processTreeGroupIDs(cmd.Process.Pid)
	for _, processGroupID := range processGroupIDs {
		if err := syscall.Kill(-processGroupID, syscall.SIGTERM); err != nil && !errors.Is(err, syscall.ESRCH) {
			return err
		}
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		allStopped := true
		for _, processGroupID := range processGroupIDs {
			err := syscall.Kill(-processGroupID, 0)
			if err == nil {
				allStopped = false
				break
			}
			if !errors.Is(err, syscall.ESRCH) {
				return err
			}
		}
		if allStopped {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}

	for _, processGroupID := range processGroupIDs {
		if err := syscall.Kill(-processGroupID, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
			return err
		}
	}

	return nil
}

type processInfo struct {
	parentID       int
	processGroupID int
}

func processTreeGroupIDs(rootProcessID int) []int {
	snapshot, err := readProcessSnapshot()
	if err != nil {
		processGroupID, getpgidErr := syscall.Getpgid(rootProcessID)
		if getpgidErr == nil {
			return []int{processGroupID}
		}
		return []int{rootProcessID}
	}

	processIDs := []int{rootProcessID}
	for index := 0; index < len(processIDs); index++ {
		parentID := processIDs[index]
		for processID, info := range snapshot {
			if info.parentID == parentID {
				processIDs = append(processIDs, processID)
			}
		}
	}

	groupSet := make(map[int]struct{})
	for _, processID := range processIDs {
		if info, ok := snapshot[processID]; ok && info.processGroupID > 0 {
			groupSet[info.processGroupID] = struct{}{}
		}
	}
	if len(groupSet) == 0 {
		return []int{rootProcessID}
	}

	processGroupIDs := make([]int, 0, len(groupSet))
	for processGroupID := range groupSet {
		processGroupIDs = append(processGroupIDs, processGroupID)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(processGroupIDs)))
	return processGroupIDs
}

func readProcessSnapshot() (map[int]processInfo, error) {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil, err
	}

	processes := make(map[int]processInfo)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		processID, err := strconv.Atoi(entry.Name())
		if err != nil {
			continue
		}

		info, err := readProcessInfo(processID)
		if err != nil {
			continue
		}
		processes[processID] = info
	}

	return processes, nil
}

func readProcessInfo(processID int) (processInfo, error) {
	data, err := os.ReadFile(filepath.Join("/proc", strconv.Itoa(processID), "stat"))
	if err != nil {
		return processInfo{}, err
	}

	stat := string(data)
	commEnd := strings.LastIndex(stat, ") ")
	if commEnd == -1 {
		return processInfo{}, fmt.Errorf("invalid proc stat for pid %d", processID)
	}

	fields := strings.Fields(stat[commEnd+2:])
	if len(fields) < 4 {
		return processInfo{}, fmt.Errorf("invalid proc stat for pid %d", processID)
	}

	parentID, err := strconv.Atoi(fields[1])
	if err != nil {
		return processInfo{}, err
	}
	processGroupID, err := strconv.Atoi(fields[2])
	if err != nil {
		return processInfo{}, err
	}

	return processInfo{parentID: parentID, processGroupID: processGroupID}, nil
}

func shutdownDatabase(rootDir string, composeFile string) {
	if err := runCommand(rootDir, "docker", "compose", "-f", composeFile, "down"); err != nil {
		log.Printf("db:down failed: %v", err)
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

func loadEnvValue(dir string, key string) (string, error) {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value, nil
	}
	return loadEnvVar(dir, ".env", key)
}

func loadEnvFile(dir string, filename string) ([]string, error) {
	path := filepath.Join(dir, filename)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var env []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		value = strings.Trim(strings.TrimSpace(value), "\"'")
		env = append(env, key+"="+value)
	}
	return env, nil
}

func mergeEnv(base []string, override []string) []string {
	result := append([]string{}, base...)
	indexByKey := make(map[string]int, len(result)+len(override))
	for index, entry := range result {
		key, _, ok := strings.Cut(entry, "=")
		if ok {
			indexByKey[key] = index
		}
	}
	for _, entry := range override {
		key, _, ok := strings.Cut(entry, "=")
		if !ok {
			continue
		}
		if index, exists := indexByKey[key]; exists {
			result[index] = entry
			continue
		}
		indexByKey[key] = len(result)
		result = append(result, entry)
	}
	return result
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
