package portalsetting

import "sync"

type Settings struct {
	AppName                   string
	PortalDescription         string
	AppURL                    string
	AppForceHTTPS             bool
	PortalAdminName           string
	PortalContactEmail        string
	PortalUnivemailLocalPart  string
	PortalUnivemailDomainPart string
	PortalStudentIDName       string
	PortalUnivemailName       string
	PortalPrimaryColorH       int
	PortalPrimaryColorS       int
	PortalPrimaryColorL       int
}

type UpdateParams = Settings

type Repository interface {
	Get() (Settings, error)
	Update(params UpdateParams) (Settings, error)
}

type MemoryRepository struct {
	mu       sync.RWMutex
	settings Settings
}

func NewMemoryRepository(initial Settings) *MemoryRepository {
	return &MemoryRepository{settings: initial}
}

func (r *MemoryRepository) Get() (Settings, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.settings, nil
}

func (r *MemoryRepository) Update(params UpdateParams) (Settings, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.settings = Settings(params)
	return r.settings, nil
}
