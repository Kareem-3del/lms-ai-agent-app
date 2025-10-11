# Markdown Output Specification

## Overview

All AI-generated solutions now output in **strict, valid Markdown format**. The AI is explicitly instructed to follow markdown conventions and never break the format.

## Enforced Rules

### **Math Assignments (with LaTeX)**

✅ **Allowed:**
- `$inline math$` - Single dollar signs for inline equations
- `$$display math$$` - Double dollar signs for display equations (on own line with blank lines)
- `**Bold Text**` - Double asterisks for headers
- Regular text for explanations
- Blank lines between sections

❌ **Forbidden:**
- Backticks `` ` `` for math notation
- Code blocks ` ``` ` for equations
- HTML tags
- Spaces between $ and math content
- Mixed formatting

### **Coding Assignments**

✅ **Allowed:**
- ` ```language ` - Proper code blocks with language specification
- `**Bold**` for section headers
- Inline `` `code` `` for variable names in text
- Blank lines between sections

❌ **Forbidden:**
- Raw code without code blocks
- Missing language specification
- HTML or special formatting

### **Writing/Other Assignments**

✅ **Allowed:**
- `**Bold**` for headers
- `- bullet points` for lists
- `1. 2. 3.` for numbered lists
- `> blockquotes` if needed
- Blank lines between paragraphs

❌ **Forbidden:**
- HTML tags
- Special formatting
- Broken markdown syntax

## Example Outputs

### **Math Assignment**

```markdown
**Laplace Transform Formulas Used:**

$$\mathcal{L}\{t^n\} = \frac{n!}{s^{n+1}}$$

$$\mathcal{L}\{e^{at}\} = \frac{1}{s - a}$$

**Solution for a. $f(t) = t^3e^{-2t} + 2\cos(4t)$:**

Step 1: Split the function into parts.

$$\mathcal{L}\{f(t)\} = \mathcal{L}\{t^3e^{-2t}\} + 2\mathcal{L}\{\cos(4t)\}$$

Step 2: Apply $\mathcal{L}\{t^n\} = \frac{n!}{s^{n+1}}$ to get $\mathcal{L}\{t^3\}$.

$$\mathcal{L}\{t^3\} = \frac{3!}{s^4} = \frac{6}{s^4}$$
```

### **Coding Assignment**

```markdown
**Solution:**

Here's the implementation using Python:

\`\`\`python
def calculate_sum(arr):
    rslt = 0
    for idx in range(len(arr)):
        rslt += arr[idx]
    return rslt
\`\`\`

**Explanation:**

The function takes an array `arr` and returns the sum of all elements.

**Time Complexity:** O(n)
**Space Complexity:** O(1)
```

### **Writing Assignment**

```markdown
**Introduction**

This essay explores the impact of technology on modern education.

**Main Points:**

- Technology increases accessibility to education
- Online platforms enable remote learning
- Digital tools enhance student engagement

**Conclusion**

In summary, technology has revolutionized how we approach education in the 21st century.
```

## Validation

The prompts now include:

1. **Explicit format instructions** - Clear rules on what to use
2. **Forbidden items list** - What NOT to use
3. **Working examples** - Show exact expected format
4. **Emphasis on standards** - "MUST be valid Markdown"

## Benefits

### **For Users:**
- ✅ Perfect rendering in any Markdown viewer
- ✅ No broken formatting
- ✅ LaTeX renders correctly
- ✅ Code syntax highlights properly
- ✅ Clean, professional output

### **For Developers:**
- ✅ Consistent output format
- ✅ Easy to parse if needed
- ✅ Version control friendly
- ✅ Platform independent

### **For Academic Use:**
- ✅ Standard format professors recognize
- ✅ Easy to convert to PDF
- ✅ Professional presentation
- ✅ Can be shared on GitHub/GitLab

## File Structure

Each solution generates:

```
Assignment Folder/
├── solution.md    ← Primary (Markdown + LaTeX)
├── solution.docx  ← Secondary (Word format)
└── solution.txt   ← Backup (raw text)
```

**Primary file:** `solution.md` contains perfect Markdown with:
- Front matter (title, course, date)
- LaTeX math notation
- Proper section headers
- Clean, readable format

## Viewing Recommendations

1. **VS Code + Markdown Preview Enhanced** ⭐ Best option
2. **Typora** - Beautiful WYSIWYG editor
3. **Obsidian** - Great for note-taking
4. **GitHub/GitLab** - Renders automatically
5. **StackEdit** - Online viewer

All support LaTeX rendering and provide perfect display.

## Quality Assurance

The AI is now instructed to:
- ✅ Follow Markdown standards strictly
- ✅ Use proper LaTeX syntax
- ✅ Include blank lines for readability
- ✅ Avoid anything that breaks rendering
- ✅ Test format compatibility

**Result:** Publication-quality mathematical documents that render perfectly everywhere!
