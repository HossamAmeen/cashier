export type CategoryIconKey =
  | 'coffee'
  | 'tea'
  | 'juice'
  | 'soft_drink'
  | 'water'
  | 'breakfast'
  | 'sandwich'
  | 'burger'
  | 'pizza'
  | 'grill'
  | 'chicken'
  | 'pasta'
  | 'rice'
  | 'salad'
  | 'soup'
  | 'appetizer'
  | 'dessert'
  | 'cake'
  | 'ice_cream'
  | 'bakery';

export const CATEGORY_ICONS: { key: CategoryIconKey; label: string }[] = [
  { key: 'coffee', label: 'قهوة' },
  { key: 'tea', label: 'شاي' },
  { key: 'juice', label: 'عصير' },
  { key: 'soft_drink', label: 'مشروبات غازية' },
  { key: 'water', label: 'مياه' },
  { key: 'breakfast', label: 'إفطار' },
  { key: 'sandwich', label: 'ساندوتش' },
  { key: 'burger', label: 'برجر' },
  { key: 'pizza', label: 'بيتزا' },
  { key: 'grill', label: 'مشويات' },
  { key: 'chicken', label: 'دجاج' },
  { key: 'pasta', label: 'باستا' },
  { key: 'rice', label: 'أرز' },
  { key: 'salad', label: 'سلطات' },
  { key: 'soup', label: 'شوربة' },
  { key: 'appetizer', label: 'مقبلات' },
  { key: 'dessert', label: 'حلويات' },
  { key: 'cake', label: 'كيك' },
  { key: 'ice_cream', label: 'أيس كريم' },
  { key: 'bakery', label: 'مخبوزات' },
];
