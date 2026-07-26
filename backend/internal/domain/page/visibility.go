package page

import "strings"

// VisibleToCircleTags reports whether a page restricted to viewableTags is
// visible to a circle carrying circleTags. A page without viewable tags is
// visible to everyone.
func VisibleToCircleTags(viewableTags []string, circleTags []string) bool {
	if len(viewableTags) == 0 {
		return true
	}

	for _, viewableTag := range viewableTags {
		for _, circleTag := range circleTags {
			if strings.EqualFold(viewableTag, circleTag) {
				return true
			}
		}
	}

	return false
}
