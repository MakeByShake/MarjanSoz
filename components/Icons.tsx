import type { ComponentProps } from "react";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  BookOpenText,
  CaretDown,
  ChatTeardropText,
  ChatsCircle,
  Check,
  Compass,
  Crown,
  Diamond,
  GearSix,
  List,
  Lock,
  MagnifyingGlass,
  PaperPlaneRight,
  Plus,
  Moon,
  Notebook,
  SealCheck,
  SignOut,
  Scroll,
  Sparkle,
  Star,
  Sun,
  Target,
  Trophy,
  User,
  X,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Иконки — набор Phosphor (MIT, phosphoricons.com).
 * Смысловые иконки (разделы, достижения) — двухтоновые duotone, служебные (стрелки, меню) — обычные.
 * Декоративные по умолчанию (aria-hidden) — подпись даёт текст рядом.
 */
type IconProps = Omit<ComponentProps<PhosphorIcon>, "size"> & { size?: number };

function make(Base: PhosphorIcon, defaultWeight: IconWeight) {
  return function Icon({ size = 20, weight = defaultWeight, ...rest }: IconProps) {
    return <Base aria-hidden="true" size={size} weight={weight} {...rest} />;
  };
}

// Разделы и достижения
export const BookIcon = make(BookOpenText, "duotone");
export const ScrollIcon = make(Scroll, "duotone");
export const QuoteIcon = make(ChatTeardropText, "duotone");
export const TrophyIcon = make(Trophy, "duotone");
export const TargetIcon = make(Target, "duotone");
export const CrownIcon = make(Crown, "duotone");
export const StarIcon = make(Star, "duotone");
export const SparklesIcon = make(Sparkle, "duotone");
export const GemIcon = make(Diamond, "duotone");
export const BadgeCheckIcon = make(SealCheck, "duotone");
export const CompassIcon = make(Compass, "duotone");
export const ChatIcon = make(ChatsCircle, "duotone");
export const NotebookIcon = make(Notebook, "duotone");

// Служебные
export const UserIcon = make(User, "regular");
export const SunIcon = make(Sun, "regular");
export const MoonIcon = make(Moon, "regular");
export const MenuIcon = make(List, "regular");
export const CloseIcon = make(X, "regular");
export const GearIcon = make(GearSix, "regular");
export const LogOutIcon = make(SignOut, "regular");
export const ArrowRightIcon = make(ArrowRight, "regular");
export const ArrowLeftIcon = make(ArrowLeft, "regular");
export const CheckIcon = make(Check, "bold");
export const LockIcon = make(Lock, "duotone");
export const SearchIcon = make(MagnifyingGlass, "regular");
export const ChevronDownIcon = make(CaretDown, "regular");
export const RefreshIcon = make(ArrowsClockwise, "regular");
export const SendIcon = make(PaperPlaneRight, "fill");
export const PlusIcon = make(Plus, "regular");
