/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client";

import { useState, KeyboardEvent } from "react";
import { Folder, FolderOpen, File, FileText, ChevronRight, ChevronDown } from "lucide-react";

type TreeNode = {
  name: string;
  type: "folder" | "file";
  icon?: React.ReactNode;
  children?: TreeNode[];
};

const treeData: TreeNode[] = [
  { name: "Summary Report PDF", type: "file", icon: <FileText className="h-4 w-4 text-red-500" /> },
  {
    name: "Dataset",
    type: "folder",
    children: [
      { name: "canonical_transactions.csv", type: "file", icon: <File className="h-4 w-4 text-gray-500" /> },
      { name: "reconciliation_results.csv", type: "file", icon: <File className="h-4 w-4 text-gray-500" /> },
    ],
  },
  {
    name: "Workflow",
    type: "folder",
    children: [
      { name: "exception_cases.csv", type: "file", icon: <File className="h-4 w-4 text-gray-500" /> },
      { name: "exception_history.csv", type: "file", icon: <File className="h-4 w-4 text-gray-500" /> },
    ],
  },
  {
    name: "Evidence Attachments",
    type: "folder",
    children: [
      { name: "manifest.json", type: "file", icon: <File className="h-4 w-4 text-yellow-600" /> },
      { name: "files", type: "folder", children: [
         { name: "INV-100234_vendor_copy.pdf", type: "file", icon: <FileText className="h-4 w-4 text-red-500" /> },
      ] },
    ],
  },
  {
    name: "Compliance",
    type: "folder",
    children: [
      { name: "audit_ledger.json", type: "file", icon: <File className="h-4 w-4 text-yellow-600" /> },
      { name: "dqe_results.json", type: "file", icon: <File className="h-4 w-4 text-yellow-600" /> },
    ],
  },
];

function TreeItem({ node, defaultOpen = true }: { node: TreeNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isFolder = node.type === "folder";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isFolder) return;
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (isOpen) setIsOpen(false);
        break;
    }
  };

  return (
    <div className="ml-4" role="treeitem" aria-expanded={isFolder ? isOpen : undefined}>
      <div 
        className={`flex items-center gap-1.5 py-1 ${isFolder ? "cursor-pointer hover:bg-gray-50 focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500" : "hover:bg-gray-50"} rounded px-1 -ml-1 select-none`}
        onClick={() => isFolder && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={isFolder ? 0 : -1}
      >
        {isFolder ? (
          <div className="flex items-center text-gray-400">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {isOpen ? <FolderOpen className="h-4 w-4 text-blue-500 ml-0.5" /> : <Folder className="h-4 w-4 text-blue-500 ml-0.5" />}
          </div>
        ) : (
          <div className="flex items-center w-5 justify-center">
            {node.icon}
          </div>
        )}
        <span className="text-sm text-gray-700 font-mono">{node.name}</span>
      </div>
      {isFolder && isOpen && node.children && (
        <div className="border-l border-gray-200 ml-2.5 pl-0.5" role="group">
          {node.children.map((child, idx) => (
            <TreeItem key={idx} node={child} defaultOpen={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvidenceDetailClient() {
  return (
    <div className="font-mono text-sm border border-gray-200 rounded-md p-3 bg-gray-50/50 overflow-x-auto" role="tree" aria-label="Evidence Package Contents">
      {treeData.map((node, idx) => (
        <TreeItem key={idx} node={node} />
      ))}
    </div>
  );
}
