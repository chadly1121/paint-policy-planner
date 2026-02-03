import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DocumentPreviewProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

// Convert markdown to HTML for TipTap
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Remove markdown code blocks wrapper if present
  html = html.replace(/```markdown\n?/g, '').replace(/```\n?/g, '');

  // Headers - process in order from largest to smallest
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic combinations
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^─+$/gm, '<hr>');

  // Process lines for lists and paragraphs
  const lines = html.split('\n');
  let result: string[] = [];
  let listStack: ('ul' | 'ol')[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\s*)[-*] (.+)$/);
    const numberedMatch = line.match(/^(\s*)\d+\. (.+)$/);

    if (bulletMatch) {
      if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ul') {
        result.push('<ul>');
        listStack.push('ul');
      }
      result.push(`<li>${bulletMatch[2]}</li>`);
    } else if (numberedMatch) {
      if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ol') {
        result.push('<ol>');
        listStack.push('ol');
      }
      result.push(`<li>${numberedMatch[2]}</li>`);
    } else {
      // Close any open lists
      while (listStack.length > 0) {
        const tag = listStack.pop();
        result.push(tag === 'ol' ? '</ol>' : '</ul>');
      }

      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<hr')) {
        result.push(`<p>${line}</p>`);
      } else if (trimmed) {
        result.push(line);
      }
    }
  }

  // Close remaining lists
  while (listStack.length > 0) {
    const tag = listStack.pop();
    result.push(tag === 'ol' ? '</ol>' : '</ul>');
  }

  return result.join('');
}

export function DocumentPreview({
  content,
  isStreaming = false,
  className,
}: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
    ],
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  // Update content as it streams in
  useEffect(() => {
    if (editor && content) {
      const htmlContent = markdownToHtml(content);
      editor.commands.setContent(htmlContent);
      
      // Auto-scroll to bottom when streaming
      if (isStreaming && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  }, [content, editor, isStreaming]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm overflow-auto',
        'document-preview',
        className
      )}
    >
      <EditorContent editor={editor} />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
      )}
    </div>
  );
}
