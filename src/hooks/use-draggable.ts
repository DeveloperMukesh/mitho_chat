
"use client";

import { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import type { ElementRef } from 'react';

export const useDraggable = <T extends HTMLElement>() => {
  const elRef = useRef<ElementRef<'div'>>(null);

  useDrag(
    ({ offset: [x, y], event }) => {
        if (elRef.current) {
            elRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
        event.stopPropagation();
    },
    {
      target: elRef,
      from: () => {
        if (elRef.current) {
            const transform = new DOMMatrix(getComputedStyle(elRef.current).transform)
            return [transform.e, transform.f]
        }
        return [0,0]
      },
    }
  );

  return elRef as React.RefObject<T>;
};
