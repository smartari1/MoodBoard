/**
 * Room Studio Components
 * Kive-style room generation studio with ingredient selection
 */

// Types
export type {
  LocalizedString,
  ColorItem,
  TextureItem,
  MaterialItem,
  CategoryItem,
  SubCategoryItem,
  GeneratedImage,
  ProjectRoom,
  IngredientType,
  IngredientSelections,
} from './types'

// Components
export { RoomStudio } from './RoomStudio'
export { StudioHeader } from './StudioHeader'
export { IngredientSidebar } from './IngredientSidebar'
export { CategorySelector } from './CategorySelector'
export { IngredientSection } from './IngredientSection'
export { IngredientItem } from './IngredientItem'
export { StudioCanvas } from './StudioCanvas'
export { SelectedIngredientsBar } from './SelectedIngredientsBar'
export { SelectedChip } from './SelectedChip'
