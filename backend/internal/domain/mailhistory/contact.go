package mailhistory

import "strings"

func ContactHistoryHeader(body string) string {
	header, _, _ := strings.Cut(body, "\n\n")
	return header
}

func ContactHistoryMatches(body, circleID, userID string) bool {
	var matchedCircle, matchedUser bool
	for _, line := range strings.Split(ContactHistoryHeader(body), "\n") {
		switch {
		case line == "from_user_id: "+userID:
			matchedUser = true
		case strings.HasPrefix(line, "from: ") && strings.HasSuffix(line, "("+userID+")"):
			matchedUser = true
		case line == "circle_id: "+circleID:
			matchedCircle = true
		case strings.HasPrefix(line, "circle: ") && strings.HasSuffix(line, "("+circleID+")"):
			matchedCircle = true
		}
	}
	return matchedCircle && matchedUser
}
