export type NumberRow = { phone: string; name: string }

// Parse a multiline "phone,name" string into an array of { phone, name }.
// - Trims whitespace from phone and name
// - Skips empty lines and lines without a phone
export function parseNumbers(raw: string): NumberRow[] {
  if (!raw) return []
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [phonePart, ...nameParts] = line.split(",")
      const phone = (phonePart || "").trim()
      const name = nameParts.join(",").trim()
      return { phone, name }
    })
    .filter((row) => row.phone.length > 0)
}
