/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { DrawerProps, useDrawer } from '../../Drawer'

describe('Drawer', () => {
  let setDrawerProps: (changes: Partial<DrawerProps>) => void

  function App () {
    const drawer = useDrawer({
      title: 'title',
      visible: true,
    })

    if (!setDrawerProps)
      setDrawerProps = drawer.setDrawerProps

    return drawer.drawer
  }

  it('should work', function () {
    render(<App />)

    expect(screen.getByText('title')).toBeInTheDocument()

    setDrawerProps({ title: 'new title' })

    expect(screen.getByText('new title')).toBeInTheDocument()
  })
})
