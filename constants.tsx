
import React from 'react';

export const APP_NAME = "Shudh";
export const TAGLINE = "Unmasking the chemistry in your world.";

export const FLAG_COLORS = {
  RED: "bg-rose-50 text-rose-700 border-rose-200",
  YELLOW: "bg-amber-50 text-amber-700 border-amber-200",
  GREEN: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

export const FLAG_ICONS = {
  RED: <i className="fa-solid fa-skull-crossbones text-rose-500"></i>,
  YELLOW: <i className="fa-solid fa-circle-exclamation text-amber-500"></i>,
  GREEN: <i className="fa-solid fa-leaf text-emerald-500"></i>
};

export const CATEGORY_THEMES = {
  FOOD: {
    primary: "emerald-600",
    bg: "bg-emerald-50",
    light: "emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-100",
    icon: "fa-burger"
  },
  COSMETICS: {
    primary: "rose-500",
    bg: "bg-rose-50",
    light: "rose-100",
    text: "text-rose-700",
    border: "border-rose-100",
    icon: "fa-spray-can-sparkles"
  },
  MEDICINE: {
    primary: "blue-600",
    bg: "bg-blue-50",
    light: "blue-100",
    text: "text-blue-700",
    border: "border-blue-100",
    icon: "fa-pills"
  }
};
