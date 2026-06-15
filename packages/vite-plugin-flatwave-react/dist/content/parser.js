import matter from 'gray-matter';
export function parseMarkdown(source) {
    const parsed = matter(source);
    const frontmatter = parsed.data;
    const attributes = { ...frontmatter };
    return {
        body: parsed.content.trim(),
        attributes,
        frontmatter,
    };
}
