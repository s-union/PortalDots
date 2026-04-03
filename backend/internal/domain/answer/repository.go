package answer

import (
	"slices"
	"sync"
	"time"

	"github.com/s-union/PortalDots/backend/internal/shared/uuidv7"
)

type Answer struct {
	ID        string
	FormID    string
	CircleID  string
	Body      string
	CreatedAt string
	UpdatedAt string
	Details   map[string][]string
}

type Upload struct {
	ID         string
	AnswerID   string
	FormID     string
	CircleID   string
	QuestionID string
	Filename   string
	MimeType   string
	SizeBytes  int64
	CreatedAt  string
	Content    []byte
}

type Repository interface {
	Get(formID, circleID string) (Answer, bool)
	Find(answerID string) (Answer, bool)
	ListByCircle(circleID string) []Answer
	ListByForm(formID string) []Answer
	ListByFormAndCircle(formID, circleID string) []Answer
	Upsert(formID, circleID, body string, details map[string][]string) Answer
	Create(formID, circleID, body string, details map[string][]string) Answer
	Update(answerID, body string, details map[string][]string) (Answer, bool)
	Delete(answerID string) bool
	ListUploads(formID, circleID string) []Upload
	ListUploadsByAnswer(answerID string) []Upload
	FindUpload(formID, circleID, uploadID string) (Upload, bool)
	FindUploadByAnswerAndQuestion(answerID, questionID string) (Upload, bool)
	AddUpload(formID, circleID, questionID, filename, mimeType string, content []byte) (Upload, bool)
	AddUploadToAnswer(answerID, questionID, filename, mimeType string, content []byte) (Upload, bool)
}

type MemoryRepository struct {
	mu                    sync.RWMutex
	answers               map[string]Answer
	answerIDsByFormCircle map[string][]string
	details               map[string]map[string][]string
	uploads               map[string][]Upload
	nextID                int
	nextUpload            int
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		answers:               map[string]Answer{},
		answerIDsByFormCircle: map[string][]string{},
		details:               map[string]map[string][]string{},
		uploads:               map[string][]Upload{},
		nextID:                1,
		nextUpload:            1,
	}
}

func (r *MemoryRepository) Get(formID, circleID string) (Answer, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	answerID, ok := r.latestAnswerID(formID, circleID)
	if !ok {
		return Answer{}, false
	}

	return r.cloneAnswerLocked(answerID), true
}

func (r *MemoryRepository) Find(answerID string) (Answer, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, ok := r.answers[answerID]; !ok {
		return Answer{}, false
	}

	return r.cloneAnswerLocked(answerID), true
}

func (r *MemoryRepository) ListByCircle(circleID string) []Answer {
	r.mu.RLock()
	defer r.mu.RUnlock()

	answers := make([]Answer, 0, len(r.answers))
	for _, currentAnswer := range r.answers {
		if currentAnswer.CircleID == circleID {
			answers = append(answers, r.cloneAnswerLocked(currentAnswer.ID))
		}
	}

	sortAnswers(answers)
	return answers
}

func (r *MemoryRepository) ListByForm(formID string) []Answer {
	r.mu.RLock()
	defer r.mu.RUnlock()

	answers := make([]Answer, 0, len(r.answers))
	for _, currentAnswer := range r.answers {
		if currentAnswer.FormID == formID {
			answers = append(answers, r.cloneAnswerLocked(currentAnswer.ID))
		}
	}

	sortAnswers(answers)
	return answers
}

func (r *MemoryRepository) ListByFormAndCircle(formID, circleID string) []Answer {
	r.mu.RLock()
	defer r.mu.RUnlock()

	answerIDs := slices.Clone(r.answerIDsByFormCircle[key(formID, circleID)])
	answers := make([]Answer, 0, len(answerIDs))
	for _, answerID := range answerIDs {
		if _, ok := r.answers[answerID]; !ok {
			continue
		}
		answers = append(answers, r.cloneAnswerLocked(answerID))
	}

	sortAnswers(answers)
	return answers
}

func (r *MemoryRepository) Upsert(formID, circleID, body string, details map[string][]string) Answer {
	r.mu.Lock()
	defer r.mu.Unlock()

	answerID, ok := r.latestAnswerID(formID, circleID)
	if !ok {
		return r.createLocked(formID, circleID, body, details)
	}

	answer, _ := r.updateLocked(answerID, body, details)
	return answer
}

func (r *MemoryRepository) Create(formID, circleID, body string, details map[string][]string) Answer {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.createLocked(formID, circleID, body, details)
}

func (r *MemoryRepository) Update(answerID, body string, details map[string][]string) (Answer, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.updateLocked(answerID, body, details)
}

func (r *MemoryRepository) Delete(answerID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	currentAnswer, ok := r.answers[answerID]
	if !ok {
		return false
	}

	delete(r.answers, answerID)
	delete(r.details, answerID)
	delete(r.uploads, answerID)

	storageKey := key(currentAnswer.FormID, currentAnswer.CircleID)
	answerIDs := r.answerIDsByFormCircle[storageKey]
	filtered := answerIDs[:0]
	for _, currentID := range answerIDs {
		if currentID != answerID {
			filtered = append(filtered, currentID)
		}
	}
	if len(filtered) == 0 {
		delete(r.answerIDsByFormCircle, storageKey)
	} else {
		r.answerIDsByFormCircle[storageKey] = append([]string(nil), filtered...)
	}

	return true
}

func (r *MemoryRepository) ListUploads(formID, circleID string) []Upload {
	r.mu.RLock()
	defer r.mu.RUnlock()

	answerID, ok := r.latestAnswerID(formID, circleID)
	if !ok {
		return nil
	}

	return cloneUploads(r.uploads[answerID], false)
}

func (r *MemoryRepository) ListUploadsByAnswer(answerID string) []Upload {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return cloneUploads(r.uploads[answerID], false)
}

func (r *MemoryRepository) FindUpload(formID, circleID, uploadID string) (Upload, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, answerID := range r.answerIDsByFormCircle[key(formID, circleID)] {
		for _, upload := range r.uploads[answerID] {
			if upload.ID == uploadID {
				return cloneUpload(upload, true), true
			}
		}
	}

	return Upload{}, false
}

func (r *MemoryRepository) FindUploadByAnswerAndQuestion(answerID, questionID string) (Upload, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, upload := range r.uploads[answerID] {
		if upload.QuestionID == questionID {
			return cloneUpload(upload, true), true
		}
	}

	return Upload{}, false
}

func (r *MemoryRepository) AddUpload(formID, circleID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	answerID, ok := r.latestAnswerID(formID, circleID)
	if !ok {
		created := r.createLocked(formID, circleID, "", map[string][]string{})
		answerID = created.ID
	}

	return r.addUploadLocked(answerID, questionID, filename, mimeType, content)
}

func (r *MemoryRepository) AddUploadToAnswer(answerID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.addUploadLocked(answerID, questionID, filename, mimeType, content)
}

func (r *MemoryRepository) createLocked(formID, circleID, body string, details map[string][]string) Answer {
	now := time.Now().UTC().Format(time.RFC3339)
	answer := Answer{
		ID:        uuidv7.MustString(),
		FormID:    formID,
		CircleID:  circleID,
		Body:      body,
		CreatedAt: now,
		UpdatedAt: now,
		Details:   cloneDetails(details),
	}
	r.nextID++
	r.answers[answer.ID] = answer
	r.details[answer.ID] = cloneDetails(details)
	r.answerIDsByFormCircle[key(formID, circleID)] = append(
		r.answerIDsByFormCircle[key(formID, circleID)],
		answer.ID,
	)

	return cloneAnswer(answer)
}

func (r *MemoryRepository) updateLocked(answerID, body string, details map[string][]string) (Answer, bool) {
	answer, ok := r.answers[answerID]
	if !ok {
		return Answer{}, false
	}

	answer.Body = body
	answer.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	answer.Details = cloneDetails(details)
	r.answers[answerID] = answer
	r.details[answerID] = cloneDetails(details)

	return cloneAnswer(answer), true
}

func (r *MemoryRepository) addUploadLocked(answerID, questionID, filename, mimeType string, content []byte) (Upload, bool) {
	currentAnswer, ok := r.answers[answerID]
	if !ok {
		return Upload{}, false
	}

	upload := Upload{
		ID:         uuidv7.MustString(),
		AnswerID:   currentAnswer.ID,
		FormID:     currentAnswer.FormID,
		CircleID:   currentAnswer.CircleID,
		QuestionID: questionID,
		Filename:   filename,
		MimeType:   mimeType,
		SizeBytes:  int64(len(content)),
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
		Content:    append([]byte(nil), content...),
	}
	r.nextUpload++

	filteredUploads := make([]Upload, 0, len(r.uploads[answerID])+1)
	filteredUploads = append(filteredUploads, upload)
	for _, storedUpload := range r.uploads[answerID] {
		if storedUpload.QuestionID == questionID && questionID != "" {
			continue
		}
		filteredUploads = append(filteredUploads, storedUpload)
	}
	r.uploads[answerID] = filteredUploads

	return cloneUpload(upload, false), true
}

func (r *MemoryRepository) latestAnswerID(formID, circleID string) (string, bool) {
	answerIDs := r.answerIDsByFormCircle[key(formID, circleID)]
	if len(answerIDs) == 0 {
		return "", false
	}

	latestID := answerIDs[0]
	latestTime := parseUpdatedAt(r.answers[latestID].UpdatedAt)
	for _, answerID := range answerIDs[1:] {
		currentTime := parseUpdatedAt(r.answers[answerID].UpdatedAt)
		if currentTime.After(latestTime) || (currentTime.Equal(latestTime) && answerID > latestID) {
			latestID = answerID
			latestTime = currentTime
		}
	}

	return latestID, true
}

func (r *MemoryRepository) cloneAnswerLocked(answerID string) Answer {
	answer := r.answers[answerID]
	answer.Details = cloneDetails(r.details[answerID])
	return answer
}

func key(formID, circleID string) string {
	return formID + "::" + circleID
}

func cloneUploads(uploads []Upload, includeContent bool) []Upload {
	cloned := make([]Upload, 0, len(uploads))
	for _, upload := range uploads {
		cloned = append(cloned, cloneUpload(upload, includeContent))
	}
	return cloned
}

func cloneUpload(upload Upload, includeContent bool) Upload {
	cloned := upload
	if includeContent {
		cloned.Content = append([]byte(nil), upload.Content...)
		return cloned
	}

	cloned.Content = nil
	return cloned
}

func cloneAnswer(answer Answer) Answer {
	answer.Details = cloneDetails(answer.Details)
	return answer
}

func cloneDetails(details map[string][]string) map[string][]string {
	if len(details) == 0 {
		return map[string][]string{}
	}

	cloned := make(map[string][]string, len(details))
	for questionID, values := range details {
		cloned[questionID] = append([]string(nil), values...)
	}
	return cloned
}

func sortAnswers(answers []Answer) {
	slices.SortStableFunc(answers, func(left, right Answer) int {
		leftTime := parseUpdatedAt(left.UpdatedAt)
		rightTime := parseUpdatedAt(right.UpdatedAt)
		switch {
		case leftTime.After(rightTime):
			return -1
		case leftTime.Before(rightTime):
			return 1
		case left.ID > right.ID:
			return -1
		case left.ID < right.ID:
			return 1
		default:
			return 0
		}
	})
}

func parseUpdatedAt(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}
	}

	return parsed.UTC()
}
