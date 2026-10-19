import React, { useState } from 'react';
import { useJobgio } from '../context/JobgioContext';
import { JobCategory } from '../types/jobgio';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Palette,
  Code,
  Compass,
  TrendingUp,
  Cpu,
  Headphones,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useJobgio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: JobCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
      });
    } else {
      addCategory({
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
        description: description.trim() || 'Job listings classification.',
        iconName: 'Briefcase',
      });
    }
    setIsModalOpen(false);
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Palette':
        return <Palette className="w-5 h-5" />;
      case 'Code':
        return <Code className="w-5 h-5" />;
      case 'Compass':
        return <Compass className="w-5 h-5" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5" />;
      case 'Headphones':
        return <Headphones className="w-5 h-5" />;
      default:
        return <Briefcase className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Job Categories</h1>
          <p className="text-xs text-[#858585] mt-1">
            Organize job types, discover high-demand professions, and manage taxonomies.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-black rounded-full transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white border border-[#EEEEEE] rounded-[24px] p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between gap-4 group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                  {renderIcon(cat.iconName)}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-neutral-400 hover:text-black rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(cat.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-base font-bold text-[#171717]">{cat.name}</h3>
                <p className="text-xs text-[#858585] mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F5F5F5] flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>{cat.jobsCount.toLocaleString()} Active Listings</span>
              <span className="text-[11px] text-neutral-400 font-mono">/{cat.slug}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Job Category'}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cybersecurity"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              URL Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. cybersecurity"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this domain..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-black hover:bg-neutral-800 rounded-full"
            >
              {editingCategory ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteCategory(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Category?"
        message="Are you sure you want to delete this job category?"
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
};
