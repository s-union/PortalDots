package pendingregistration

import "testing"

func TestValidateRegistrationProfileRejectsInvalidContactEmail(t *testing.T) {
	profile := validRegistrationProfile()
	profile.ContactEmail = "bad user@example.com"

	result := ValidateRegistrationProfile(profile)

	if len(result.ContactEmail) == 0 {
		t.Fatal("expected contact email validation error")
	}
}

func TestValidateRegistrationProfileAcceptsValidContactEmail(t *testing.T) {
	profile := validRegistrationProfile()
	profile.ContactEmail = "user@example.com"

	result := ValidateRegistrationProfile(profile)

	if len(result.ContactEmail) != 0 {
		t.Fatalf("expected no contact email validation error, got %#v", result.ContactEmail)
	}
}

func validRegistrationProfile() RegistrationProfile {
	return RegistrationProfile{
		LastName:             "山田",
		LastNameReading:      "やまだ",
		FirstName:            "太郎",
		FirstNameReading:     "たろう",
		ContactEmail:         "user@example.com",
		PhoneNumber:          "090-1234-5678",
		Password:             "password1",
		PasswordConfirmation: "password1",
	}
}
