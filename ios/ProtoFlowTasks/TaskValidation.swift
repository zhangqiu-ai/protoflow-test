import Foundation

// Returns the trimmed task name, or nil when it is empty.
func validTaskName(_ draft: String) -> String? {
    let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
    return text.isEmpty ? nil : text
}
