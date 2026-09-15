import React, { useState, useRef, useEffect } from "react";
import { performPostAction } from "../../postActionRegistry";

type PostMenuProps = {
  item: any;
  currentUser?: any;
  onShare?: (post: any) => void;
};

export const PostMenu: React.FC<PostMenuProps> = ({
  item,
  currentUser,
  onShare,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor =
    currentUser && Number(currentUser.id) === Number(item.user_id);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ----------------------------
  // Edit
  // ----------------------------
  const handleEdit = () => {
    const text = prompt("Edit content", item.content || item.caption || "");
    if (!text) return;

    performPostAction(item.type, "edit", {
      id: item.id,
      content: text,
      caption: text,
    });

    setOpen(false);
  };

  // ----------------------------
  // Delete
  // ----------------------------
  const handleDelete = () => {
    if (!confirm("Delete this post?")) return;

    performPostAction(item.type, "delete", {
      id: item.id,
      groupId: item.group_id,
    });

    setOpen(false);
  };

  // ----------------------------
  // Share
  // ----------------------------
  const handleShare = () => {
    if (onShare) {
      onShare(item);
    } else {
      performPostAction(item.type, "share", { id: item.id });
    }

    setOpen(false);
  };

  // ----------------------------
  // Report
  // ----------------------------
  const handleReport = () => {
    performPostAction(item.type, "report", {
      id: item.id,
      type: item.type,
    });

    alert("Report submitted");
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Three dot button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1E293B] transition"
      >
        <i className="fas fa-ellipsis-h text-[#94A3B8]"></i>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Edit */}
          {isAuthor && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#1E293B]"
            >
              <i className="fas fa-edit text-[#1877F2] w-4"></i>
              <span className="text-[#F8FAFC]">Edit</span>
            </button>
          )}

          {/* Delete */}
          {isAuthor && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#1E293B]"
            >
              <i className="fas fa-trash text-red-500 w-4"></i>
              <span className="text-red-400">Delete</span>
            </button>
          )}

          {/* Divider */}
          <div className="h-[1px] bg-[#1E293B]"></div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#1E293B]"
          >
            <i className="fas fa-share text-[#94A3B8] w-4"></i>
            <span className="text-[#F8FAFC]">Share</span>
          </button>

          {/* Report */}
          {!isAuthor && (
            <button
              onClick={handleReport}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#1E293B]"
            >
              <i className="fas fa-flag text-orange-400 w-4"></i>
              <span className="text-[#F8FAFC]">Report</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
