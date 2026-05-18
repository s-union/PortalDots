import { cva, type VariantProps } from 'class-variance-authority'

export const alertVariants = cva('rounded border px-4 py-3 text-sm', {
  variants: {
    tone: {
      danger: 'border-danger bg-danger-light text-danger',
      success: 'border-success bg-success-light text-success',
      info: 'border-primary bg-primary-light text-primary',
      muted: 'border-border bg-surface-light text-muted'
    }
  },
  defaultVariants: {
    tone: 'danger'
  }
})

export type AlertVariantProps = VariantProps<typeof alertVariants>

export const statusBadgeVariants = cva('inline-flex items-center rounded-full text-xs font-semibold', {
  variants: {
    tone: {
      primary: '',
      muted: '',
      danger: '',
      success: '',
      warning: '',
      accent: ''
    },
    appearance: {
      filled: '',
      outlined: 'border'
    },
    size: {
      sm: 'px-2 py-0.5',
      md: 'px-2.5 py-1'
    }
  },
  compoundVariants: [
    { tone: 'primary', appearance: 'filled', class: 'bg-primary-light text-primary' },
    { tone: 'primary', appearance: 'outlined', class: 'border-primary text-primary' },
    { tone: 'muted', appearance: 'filled', class: 'bg-muted-light text-muted' },
    { tone: 'muted', appearance: 'outlined', class: 'border-border text-muted' },
    { tone: 'danger', appearance: 'filled', class: 'bg-danger-light text-danger' },
    { tone: 'danger', appearance: 'outlined', class: 'border-danger text-danger' },
    { tone: 'success', appearance: 'filled', class: 'bg-success-light text-success' },
    { tone: 'success', appearance: 'outlined', class: 'border-success text-success' },
    { tone: 'warning', appearance: 'filled', class: 'bg-warning-light text-warning' },
    { tone: 'warning', appearance: 'outlined', class: 'border-warning text-warning' },
    { tone: 'accent', appearance: 'filled', class: 'bg-primary text-white rounded' }
  ],
  defaultVariants: {
    tone: 'muted',
    appearance: 'filled',
    size: 'md'
  }
})

export type StatusBadgeVariantProps = VariantProps<typeof statusBadgeVariants>

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded border text-center leading-[1.15] no-underline transition appearance-none hover:no-underline focus:no-underline disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border-primary bg-primary text-white hover:bg-primary-hover',
        secondary: 'border-border bg-surface text-body hover:bg-surface-light',
        danger: 'border-danger bg-danger text-white hover:bg-danger-hover',
        dangerOutline: 'border-danger bg-surface text-danger hover:bg-danger-light',
        success: 'border-success bg-success text-white hover:bg-success-hover',
        primaryInverse: 'border-border bg-surface text-primary hover:bg-primary-inverse-hover',
        transparent: 'border-border bg-transparent text-body hover:bg-surface'
      },
      size: {
        xs: 'px-4 py-2 text-xs',
        sm: 'px-2 py-[0.2rem] text-[0.9rem]',
        md: 'px-4 py-2 text-sm',
        lg: 'px-4 py-3 text-sm',
        wide: 'px-8 py-3 text-sm'
      },
      weight: {
        normal: 'font-normal',
        semibold: 'font-semibold',
        bold: 'font-bold'
      },
      fullWidth: {
        true: 'w-full',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      weight: 'normal',
      fullWidth: false
    }
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-[0.45rem] transition disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        ghost: 'text-body hover:bg-primary-light hover:text-primary',
        surface: 'border border-border bg-surface text-body hover:bg-surface-light',
        danger: 'border border-danger text-danger hover:bg-danger-light',
        subtleDanger: 'text-muted hover:bg-danger-light hover:text-danger'
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'sm'
    }
  }
)

export type IconButtonVariantProps = VariantProps<typeof iconButtonVariants>

export const surfaceVariants = cva('rounded border border-border bg-surface', {
  variants: {
    shadow: {
      none: '',
      lv1: 'shadow-lv1',
      lv2: 'shadow-lv2',
      lv3: 'shadow-lv3',
      lv4: 'shadow-lv4'
    },
    overflowHidden: {
      true: 'overflow-hidden',
      false: ''
    }
  },
  defaultVariants: {
    shadow: 'lv1',
    overflowHidden: false
  }
})

export type SurfaceVariantProps = VariantProps<typeof surfaceVariants>

export const navMenuLinkVariants = cva(
  'relative flex items-center px-6 py-[1.2rem] text-sm no-underline transition-colors duration-[0.15s] hover:bg-surface-light hover:no-underline',
  {
    variants: {
      active: {
        true: 'font-bold text-primary',
        false: 'text-body'
      }
    },
    defaultVariants: {
      active: false
    }
  }
)

export const bottomTabLinkVariants = cva(
  'flex w-full flex-col items-center py-3 text-center no-underline hover:no-underline',
  {
    variants: {
      active: {
        true: 'text-primary',
        false: 'text-muted'
      }
    },
    defaultVariants: {
      active: false
    }
  }
)

export const bottomTabLabelVariants = cva('inline-block rounded-full px-2 text-[0.6rem] font-bold', {
  variants: {
    active: {
      true: 'bg-surface-light',
      false: ''
    }
  },
  defaultVariants: {
    active: false
  }
})

export const tabStripItemVariants = cva(
  'relative block px-6 pb-4 pt-6 text-body no-underline hover:no-underline max-[860px]:whitespace-nowrap',
  {
    variants: {
      active: {
        true: 'font-bold',
        false: ''
      }
    },
    defaultVariants: {
      active: false
    }
  }
)

export const tabStripBadgeVariants = cva(
  'inline-flex items-center justify-center rounded px-1.5 text-[0.75em] font-medium leading-[1.75]',
  {
    variants: {
      tone: {
        primary: 'bg-primary-light text-primary',
        muted: 'bg-surface-light text-muted',
        danger: 'bg-danger-light text-danger'
      }
    },
    defaultVariants: {
      tone: 'muted'
    }
  }
)

export const formControlVariants = cva(
  'rounded border bg-form-control px-4 py-3 text-sm text-body outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30',
  {
    variants: {
      hasError: {
        true: 'border-danger',
        false: 'border-border'
      }
    },
    defaultVariants: {
      hasError: false
    }
  }
)
