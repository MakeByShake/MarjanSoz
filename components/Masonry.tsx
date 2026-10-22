"use client";

import { type ReactNode, useCallback, useSyncExternalStore } from "react";

/*
  Кладка карточек по колонкам. Карточки раскладываются по очереди (1-я, 2-я, 3-я колонка, снова 1-я…),
  поэтому порядок чтения остаётся построчным, а раскрытая карточка сдвигает вниз только свою колонку — не весь ряд.
*/

/** [минимальная ширина экрана, колонок], от широкого к узкому. Объявляйте константой вне компонента. */
export type Breakpoints = readonly (readonly [number, number])[];

function useColumnCount(breakpoints: Breakpoints) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const lists = breakpoints.map(([w]) => matchMedia(`(min-width: ${w}px)`));
      lists.forEach((l) => l.addEventListener("change", onChange));
      return () => lists.forEach((l) => l.removeEventListener("change", onChange));
    },
    [breakpoints],
  );
  const get = useCallback(() => breakpoints.find(([w]) => matchMedia(`(min-width: ${w}px)`).matches)?.[1] ?? 1, [breakpoints]);
  return useSyncExternalStore(subscribe, get, () => 1);
}

export function Masonry<T>({
  items,
  breakpoints,
  getKey,
  renderItem,
  itemClassName = "",
}: {
  items: T[];
  breakpoints: Breakpoints;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  itemClassName?: string;
}) {
  const columns = useColumnCount(breakpoints);
  const stacks = Array.from({ length: columns }, (_, c) => items.filter((_, i) => i % columns === c));
  return (
    <div className="flex items-start gap-4">
      {stacks.map((stack, c) => (
        <ul key={c} className="flex min-w-0 flex-1 flex-col gap-4">
          {stack.map((item) => (
            <li key={getKey(item)} className={itemClassName}>
              {renderItem(item)}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
