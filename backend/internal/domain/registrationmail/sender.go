package registrationmail

import "context"

type DeliveryResult struct {
	DeliveryMode string
	VerifyURL    string
}

type Message struct {
	AppName   string
	To        string
	VerifyURL string
}

type Sender interface {
	SendVerificationMail(ctx context.Context, message Message) (DeliveryResult, error)
}

type MockSender struct{}

func NewMockSender() *MockSender {
	return &MockSender{}
}

func (s *MockSender) SendVerificationMail(_ context.Context, message Message) (DeliveryResult, error) {
	return DeliveryResult{
		DeliveryMode: "mock",
		VerifyURL:    message.VerifyURL,
	}, nil
}
