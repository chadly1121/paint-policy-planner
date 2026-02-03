import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  className?: string;
  placeholder?: string;
}

// Convert markdown to HTML for TipTap
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Bullet lists
  const lines = html.split('\n');
  let inList = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[-*] (.+)$/);
    const numberedMatch = line.match(/^\d+\. (.+)$/);

    if (bulletMatch) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`);
    } else if (numberedMatch) {
      if (!inList) {
        processedLines.push('<ol>');
        inList = true;
      }
      processedLines.push(`<li>${numberedMatch[1]}</li>`);
    } else {
      if (inList) {
        // Check if previous was ul or ol
        const lastListTag = processedLines.find(l => l === '<ul>' || l === '<ol>');
        processedLines.push(lastListTag === '<ol>' ? '</ol>' : '</ul>');
        inList = false;
      }
      if (line.trim()) {
        // Wrap non-empty lines in paragraphs if not already wrapped
        if (!line.startsWith('<h') && !line.startsWith('<ul') && !line.startsWith('<ol') && !line.startsWith('<li')) {
          processedLines.push(`<p>${line}</p>`);
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push('<p></p>');
      }
    }
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  className,
  placeholder = 'Start typing...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownToHtml(content),
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getHTML();
      const newContent = markdownToHtml(content);
      // Only update if content is significantly different
      if (newContent !== currentContent && content.length > 0) {
        editor.commands.setContent(newContent);
      }
    }
  }, [content, editor]);

  return (
    <div
      className={cn(
        'rounded-lg border bg-background',
        editable && 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
