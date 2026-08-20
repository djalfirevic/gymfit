'use client'

import { useTheme } from '@/lib/theme'

/**
 * Recharts renders colors as SVG presentation attributes, which do not resolve
 * `var(--token)`. So chart colors have to be picked in JS rather than inherited
 * from the CSS token layer like everything else.
 *
 * Series hues are chosen to stay legible on both grounds -- the previous dark
 * palette leaned on pale blue/yellow that washed out to nothing on white.
 */
export type ChartTheme = {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  primary: string
  danger: string
  series: string[]
}

const LIGHT: ChartTheme = {
  grid: '#e9ebec',
  axis: '#878a99',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e9ebec',
  tooltipText: '#212529',
  primary: '#405189',
  danger: '#e35a3e',
  series: ['#2b8fc7', '#e35a3e', '#405189', '#0a9c88', '#c98f2c', '#7f63c4'],
}

const DARK: ChartTheme = {
  grid: '#12314f',
  axis: '#838a95',
  tooltipBg: '#05192f',
  tooltipBorder: '#2a4562',
  tooltipText: '#ced4da',
  primary: '#8fa2dd',
  danger: '#f8836a',
  series: ['#41b7e8', '#f8836a', '#8fa2dd', '#2ecfb8', '#f7b84b', '#a78bfa'],
}

export function useChartTheme(): ChartTheme {
  return useTheme() === 'dark' ? DARK : LIGHT
}

export function seriesColor(theme: ChartTheme, index: number): string {
  return theme.series[index % theme.series.length]
}
