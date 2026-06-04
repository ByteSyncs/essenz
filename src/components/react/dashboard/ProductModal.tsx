import React, { useState } from 'react'
import { uploadImageFromClient } from '../../../libs/uploadClient'

interface Category {
  id: string
  title: string
}

interface ProductModalProps {
  slug: string
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  onCreateCategory: (title: string) => Promise<Category>
  onSaveProduct: (productData: any) => Promise<void>
}

const DEFAULT_CATEGORIES = ['Cafés calientes', 'Cafés fríos', 'Pastelería', 'Bebidas combinadas']

export default function ProductModal({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onSaveProduct,
  slug,
}: ProductModalProps) {
  if (!isOpen) return null

  const [categoryId, setCategoryId] = useState<string>('')
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false)
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>('')

  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [intensity, setIntensity] = useState<number | ''>('')

  const [grams, setGrams] = useState<string>('')
  const [bitterness, setBitterness] = useState<string>('')
  const [sugar, setSugar] = useState<string>('')
  const [noteInput, setNoteInput] = useState<string>('')
  const [notes, setNotes] = useState<string[]>([])

  const [isActive, setIsActive] = useState<boolean>(true)
  const [inOffer, setInOffer] = useState<boolean>(false)
  const [offerPercent, setOfferPercent] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(false)

  const handleAddNote = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && noteInput.trim()) {
      e.preventDefault()
      if (!notes.includes(noteInput.trim())) {
        setNotes([...notes, noteInput.trim()])
      }
      setNoteInput('')
    }
  }

  const handleRemoveNote = (indexToRemove: number) => {
    setNotes(notes.filter((_, i) => i !== indexToRemove))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let finalCategoryId = categoryId

      if (isCreatingCategory && newCategoryTitle.trim()) {
        const newCat = await onCreateCategory(newCategoryTitle.trim())
        finalCategoryId = newCat.id
      } else if (categoryId.startsWith('SUGGEST-')) {
        const cleanTitle = categoryId.replace('SUGGEST-', '')
        const newCat = await onCreateCategory(cleanTitle)
        finalCategoryId = newCat.id
      }

      if (!finalCategoryId) {
        alert('Por favor, selecciona o crea una categoría obligatoria.')
        setLoading(false)
        return
      }

      let uploadedImageUrl = ''
      if (imageFile) {
        uploadedImageUrl = await uploadImageFromClient(imageFile, 'menu-items', slug)
      }

      const productPayload = {
        category_id: finalCategoryId,
        name,
        description: description || null,
        price: parseFloat(price),
        image_url: uploadedImageUrl || null,
        intensity: intensity === '' ? null : intensity,
        details: {
          grams,
          bitterness,
          sugar,
          notes,
        },
        is_active: isActive,
        in_offer: inOffer,
        offer_percent: inOffer && offerPercent !== '' ? Number(offerPercent) : null,
      }

      await onSaveProduct(productPayload)
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-(--clr-bg) text-(--clr-ink) p-8 shadow-2xl border border-(--clr-ink)/10"
        style={{ borderRadius: 'var(--radius-card)' }}
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-(--clr-ink)/10">
          <h3 className="text-2xl uppercase tracking-tight font-(--font-display) text-(--clr-ink-dark)">
            Añadir Producto al Menú
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-(--clr-ink)/60 hover:text-(--clr-ink) cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 font-(--font-ui) text-sm">
          <div className="p-4 bg-(--clr-white) border border-(--clr-ink)/5 rounded-xl space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-accent)">
              Categoría del Producto *
            </label>

            {!isCreatingCategory ? (
              <select
                className="w-full p-3 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-lg focus:outline-none focus:border-(--clr-accent) appearance-none"
                value={categoryId}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    setIsCreatingCategory(true)
                  } else {
                    setCategoryId(e.target.value)
                  }
                }}
                required
              >
                <option value="">-- Selecciona una categoría --</option>
                <option value="NEW" className="font-bold text-(--clr-accent)">
                  ✨ + Crear Nueva Categoría
                </option>

                {categories.length > 0 && (
                  <optgroup label="Categorías del Menú">
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Sugerencias rápidas">
                  {DEFAULT_CATEGORIES.map((defCat, idx) => (
                    <option key={`def-${idx}`} value={`SUGGEST-${defCat}`}>
                      {defCat}
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-(--clr-ink)/60">Escribe la nueva categoría:</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="text-xs text-(--clr-accent) hover:underline cursor-pointer"
                  >
                    Volver a la lista
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ej: Cafés Especiales de Especialidad"
                  className="w-full p-3 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-lg focus:outline-none focus:border-(--clr-accent)"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Latte Macchiato"
                className="w-full p-3 bg-(--clr-white) border border-(--clr-ink)/10 rounded-lg focus:outline-none focus:border-(--clr-accent)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80">
                Precio ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full p-3 bg-(--clr-white) border border-(--clr-ink)/10 rounded-lg focus:outline-none focus:border-(--clr-accent)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80">
              Descripción
            </label>
            <textarea
              placeholder="Notas de cata, infusión, origen de los granos..."
              rows={2}
              className="w-full p-3 bg-(--clr-white) border border-(--clr-ink)/10 rounded-lg focus:outline-none focus:border-(--clr-accent) resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80">
              Imagen del Producto
            </label>
            <div className="flex items-center gap-4 p-4 bg-(--clr-white) border border-(--clr-ink)/10 rounded-xl">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-(--clr-ink)/10"
                />
              )}
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs text-(--clr-ink)/60 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-(--clr-accent)/10 file:text-(--clr-accent) file:hover:bg-(--clr-accent)/20 file:cursor-pointer"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="p-4 bg-(--clr-white) border border-(--clr-ink)/5 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-(--clr-accent-light) border-b border-(--clr-ink)/5 pb-1">
              Especificaciones de Cafetería (Opcional)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs text-(--clr-ink)/70">Intensidad (1 al 5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  placeholder="Ej: 3"
                  className="w-full p-2 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-md focus:outline-none focus:border-(--clr-accent)"
                  value={intensity}
                  onChange={(e) =>
                    setIntensity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-(--clr-ink)/70">Gramos (Shot/Carga)</label>
                <input
                  type="text"
                  placeholder="Ej: 18g"
                  className="w-full p-2 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-md focus:outline-none focus:border-(--clr-accent)"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-(--clr-ink)/70">Amargor</label>
                <input
                  type="text"
                  placeholder="Ej: Medio-Bajo"
                  className="w-full p-2 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-md focus:outline-none focus:border-(--clr-accent)"
                  value={bitterness}
                  onChange={(e) => setBitterness(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-(--clr-ink)/70">
                  Nivel de Azúcar sugerido
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sin azúcar"
                  className="w-full p-2 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-md focus:outline-none focus:border-(--clr-accent)"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-(--clr-ink)/70">
                Notas de Cata (Presiona Enter para agregar)
              </label>
              <input
                type="text"
                placeholder="Ej: Chocolate, Cítrico"
                className="w-full p-2 bg-(--clr-bg) border border-(--clr-ink)/10 rounded-md focus:outline-none focus:border-(--clr-accent)"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={handleAddNote}
              />
              {notes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {notes.map((note, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-(--clr-accent)/10 text-(--clr-accent) font-medium text-xs rounded-full"
                    >
                      {note}
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(index)}
                        className="hover:text-(--clr-ink-dark) font-bold ml-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-(--clr-white) border border-(--clr-ink)/5 rounded-xl">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 accent-(--clr-accent)"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label
                  htmlFor="isActive"
                  className="text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80 cursor-pointer"
                >
                  Producto Activo (Visible en web)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inOffer"
                  className="w-4 h-4 accent-(--clr-accent)"
                  checked={inOffer}
                  onChange={(e) => setInOffer(e.target.checked)}
                />
                <label
                  htmlFor="inOffer"
                  className="text-xs font-bold uppercase tracking-wider text-(--clr-ink)/80 cursor-pointer"
                >
                  ¿Está en Oferta?
                </label>
              </div>
            </div>

            {inOffer && (
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-(--clr-accent)">
                  % de Descuento
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ej: 15"
                  className="w-full p-2 bg-(--clr-bg) border border-(--clr-accent)/30 rounded-md focus:outline-none focus:border-(--clr-accent)"
                  value={offerPercent}
                  onChange={(e) =>
                    setOfferPercent(e.target.value === '' ? '' : String(Number(e.target.value)))
                  }
                  required={inOffer}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--clr-ink)/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-(--clr-ink)/20 text-(--clr-ink)/80 hover:bg-(--clr-ink)/5 transition-colors font-medium tracking-wide cursor-pointer"
              style={{ borderRadius: 'var(--radius-btn)' }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-(--clr-accent) text-(--clr-white) hover:bg-(--clr-accent-light) transition-colors font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50"
              style={{ borderRadius: 'var(--radius-btn)' }}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
