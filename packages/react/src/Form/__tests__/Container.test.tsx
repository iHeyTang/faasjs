/**
 * @jest-environment @happy-dom/jest-environment
 */
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { expectType } from 'tsd'
import { FormContainer, type FormProps } from '../Container'
import type {
  FormButtonElementProps,
  FormInputElementProps,
  FormLabelElementProps,
} from '../elements'

describe('FormContainer', () => {
  const defaultProps = {
    items: [{ name: 'test' }],
    onSubmit: jest.fn(),
  }

  it('should render FormBody', () => {
    render(<FormContainer {...defaultProps} />)
    expect(screen.getByText('test')).not.toBeNull()
  })

  it('should call onSubmit with correct values', async () => {
    const onSubmit = jest.fn().mockResolvedValueOnce(Promise.resolve())
    render(<FormContainer {...defaultProps} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onSubmit).toHaveBeenCalledWith({ test: '' })
  })

  it('should merge default values correctly', () => {
    const defaultValues = { test: 'default' }

    render(<FormContainer {...defaultProps} defaultValues={defaultValues} />)

    expect(screen.getByDisplayValue('default')).not.toBeNull()
  })

  it('should support custom input props', () => {
    type CustomInputProps = FormInputElementProps & {
      custom?: boolean
    }

    expectType<
      ComponentType<
        FormProps<
          { key: string },
          {
            Input: ComponentType<CustomInputProps>
            Label: ComponentType<FormLabelElementProps>
            Button: ComponentType<FormButtonElementProps>
          }
        >
      >
    >(
      FormContainer<
        { key: string },
        {
          Input: ComponentType<CustomInputProps>
          Label: ComponentType<FormLabelElementProps>
          Button: ComponentType<FormButtonElementProps>
        }
      >
    )

    const props: FormProps<
      { key: string },
      {
        Input: ComponentType<CustomInputProps>
        Label: ComponentType<FormLabelElementProps>
        Button: ComponentType<FormButtonElementProps>
      }
    > = {
      items: [
        {
          name: 'test',
          input: {
            props: {
              custom: true,
            },
          },
        },
      ],
    }

    expectType<{ key: string }>(props.defaultValues)

    expectType<{ custom?: boolean }>(props.items[0].input.props)
  })
})
