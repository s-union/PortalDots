import { configure } from 'storybook/test'

// Story decorators and navigation load routes and API data asynchronously.
configure({ asyncUtilTimeout: 5000 })
