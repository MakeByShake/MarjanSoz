import type { ReactNode, SVGProps } from "react";

/**
 * Единый набор линейных иконок вместо эмодзи: 24×24, линия 1.75, цвет от текста.
 * Декоративные по умолчанию (aria-hidden) — подпись даёт текст рядом.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function make(paths: ReactNode) {
  return function Icon({ size = 20, ...rest }: IconProps) {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const BookIcon = make(
  <>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z" />
    <path d="M12 6.5v13" />
  </>,
);

export const ScrollIcon = make(
  <>
    <path d="M7 4h11a2 2 0 0 1 2 2v1h-4" />
    <path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10" />
    <path d="M7 4a2 2 0 0 0-2 2v11" />
    <path d="M9 9h4M9 12.5h4" />
  </>,
);

export const QuoteIcon = make(
  <>
    <path d="M4 20V9a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5H8Z" />
    <path d="M9 9.5h6M9 12.5h3.5" />
  </>,
);

export const TrophyIcon = make(
  <>
    <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
    <path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3" />
    <path d="M12 13v3.5M8.5 20h7M10 16.5h4l.5 3.5h-5Z" />
  </>,
);

export const UserIcon = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);

export const SunIcon = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>,
);

export const MoonIcon = make(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);

export const MenuIcon = make(<path d="M4 7h16M4 12h16M4 17h10" />);

export const CloseIcon = make(<path d="M6 6l12 12M18 6 6 18" />);

export const GearIcon = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

export const LogOutIcon = make(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </>,
);

export const ArrowRightIcon = make(<path d="M5 12h14M13 6l6 6-6 6" />);

export const ArrowLeftIcon = make(<path d="M19 12H5M11 6l-6 6 6 6" />);

export const CheckIcon = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);

export const LockIcon = make(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);

export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>,
);

export const ChevronDownIcon = make(<path d="M6 9l6 6 6-6" />);

export const TargetIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </>,
);

export const CrownIcon = make(
  <>
    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Z" />
    <path d="M5 19h14" />
  </>,
);

export const StarIcon = make(
  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z" />,
);

export const SparklesIcon = make(
  <>
    <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6Z" />
    <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z" />
  </>,
);

export const GemIcon = make(
  <>
    <path d="M6 3.5h12L22 9l-10 12L2 9Z" />
    <path d="M2 9h20M9.5 3.5 8 9l4 12 4-12-1.5-5.5" />
  </>,
);

export const BadgeCheckIcon = make(
  <>
    <path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.4-1.8.9-2.9-.9-2.9 2.4-1.8.9-2.9 3 .2Z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </>,
);

export const RefreshIcon = make(
  <>
    <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" />
    <path d="M4 3.5V8h4.5M4 13a8 8 0 0 0 14.6 4.5L20 16" />
    <path d="M20 20.5V16h-4.5" />
  </>,
);

export const CompassIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5Z" />
  </>,
);
