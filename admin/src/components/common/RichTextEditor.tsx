import React, { useEffect, useRef } from 'react';
import { Bold, Heading2, Italic, Link, List, ListOrdered } from 'lucide-react';
import { sanitizeRichText } from '../../utils/sanitizeRichText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value;
  }, [value]);

  const command = (name: string, argument?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, argument);
    onChange(editor.current?.innerHTML || '');
  };

  const addLink = () => {
    const href = window.prompt('Link URL (https://...)');
    if (href) command('createLink', href);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
      <div className="flex flex-wrap gap-1 border-b bg-gray-50 p-2">
        <button type="button" title="Bold" onClick={() => command('bold')} className="rounded p-1.5 text-gray-600 hover:bg-white"><Bold className="h-4 w-4" /></button>
        <button type="button" title="Italic" onClick={() => command('italic')} className="rounded p-1.5 text-gray-600 hover:bg-white"><Italic className="h-4 w-4" /></button>
        <button type="button" title="Heading" onClick={() => command('formatBlock', 'h2')} className="rounded p-1.5 text-gray-600 hover:bg-white"><Heading2 className="h-4 w-4" /></button>
        <button type="button" title="Bulleted list" onClick={() => command('insertUnorderedList')} className="rounded p-1.5 text-gray-600 hover:bg-white"><List className="h-4 w-4" /></button>
        <button type="button" title="Numbered list" onClick={() => command('insertOrderedList')} className="rounded p-1.5 text-gray-600 hover:bg-white"><ListOrdered className="h-4 w-4" /></button>
        <button type="button" title="Link" onClick={addLink} className="rounded p-1.5 text-gray-600 hover:bg-white"><Link className="h-4 w-4" /></button>
        <button type="button" onClick={() => command('formatBlock', 'p')} className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-white">Normal</button>
      </div>
      <div ref={editor} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={(event) => onChange(event.currentTarget.innerHTML)} onBlur={(event) => onChange(sanitizeRichText(event.currentTarget.innerHTML))} className="min-h-28 bg-white px-3 py-2 text-sm outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]" />
    </div>
  );
};

export default RichTextEditor;
