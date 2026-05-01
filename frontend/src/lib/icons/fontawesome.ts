import { config, dom, library } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faArrowDown,
  faArrowUp,
  faArrowsRotate,
  faAt,
  faBell,
  faBullhorn,
  faCheck,
  faCheckCircle,
  faChevronLeft,
  faChevronRight,
  faCircle,
  faCog,
  faEdit,
  faExclamationCircle,
  faExternalLinkAlt,
  faFileCsv,
  faFileExport,
  faFilter,
  faHome,
  faInfoCircle,
  faKey,
  faList,
  faLock,
  faPencilAlt,
  faPlus,
  faSearch,
  faShieldAlt,
  faSort,
  faSortDown,
  faSortUp,
  faSpinner,
  faStar,
  faStore,
  faSync,
  faTags,
  faThumbtack,
  faTimes,
  faTrash,
  faUser,
  faUserEdit,
  faUsers
} from '@fortawesome/free-solid-svg-icons'
import {
  faAddressBook,
  faCopy,
  faEdit as faRegularEdit,
  faEnvelope,
  faEye,
  faFileAlt,
  faFileArchive
} from '@fortawesome/free-regular-svg-icons'

let isInitialized = false

export function initializeFontAwesome() {
  if (isInitialized) {
    return
  }

  config.autoAddCss = false

  library.add(
    faAddressBook,
    faAngleDoubleLeft,
    faAngleDoubleRight,
    faArrowDown,
    faArrowUp,
    faArrowsRotate,
    faAt,
    faBell,
    faBullhorn,
    faCheck,
    faCheckCircle,
    faChevronLeft,
    faChevronRight,
    faCircle,
    faCog,
    faCopy,
    faEdit,
    faEnvelope,
    faExclamationCircle,
    faExternalLinkAlt,
    faEye,
    faFileAlt,
    faFileArchive,
    faFileCsv,
    faFileExport,
    faFilter,
    faHome,
    faInfoCircle,
    faKey,
    faList,
    faLock,
    faPencilAlt,
    faPlus,
    faRegularEdit,
    faSearch,
    faShieldAlt,
    faSort,
    faSortDown,
    faSortUp,
    faSpinner,
    faStar,
    faStore,
    faSync,
    faTags,
    faThumbtack,
    faTimes,
    faTrash,
    faUser,
    faUserEdit,
    faUsers
  )

  dom.watch()
  isInitialized = true
}
