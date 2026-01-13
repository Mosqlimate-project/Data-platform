'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  owner?: string;
  repo?: string;
  branch?: string;
}

export default function MarkdownRenderer({
  content,
  owner,
  repo,
  branch = "main"
}: MarkdownRendererProps) {

  const transformImageUri = (src: string) => {
    if (/^https?:/.test(src)) {
      return src;
    }
    if (owner && repo) {
      const cleanSrc = src.replace(/^\//, '');
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanSrc}`;
    }
    return src;
  };

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        urlTransform={transformImageUri}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold border-b pb-2 mb-6 mt-8" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold border-b pb-2 mb-4 mt-6" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mb-4 mt-6" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-4 leading-7" {...props} />
          ),
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={dracula}
                language={match[1]}
                PreTag="div"
                className="rounded-md my-4"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-pink-500" {...props}>
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-8 border rounded-lg">
              <table className="w-full text-left text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted/50 border-b" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 font-medium" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 border-t" {...props} />
          ),
          img: ({ node, ...props }) => (
            <img {...props} className="max-h-[500px] w-auto rounded-lg shadow-md mx-auto my-6" />
          ),
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
