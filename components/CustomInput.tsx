import { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type CustomInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder: string
  type?: 'text' | 'email' | 'password'
}

const CustomInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
}: CustomInputProps<TFieldValues>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="form-item">
          <FormLabel className="form-label">{label}</FormLabel>
          <div className="flex w-full flex-col">
            <FormControl>
              <Input type={type} placeholder={placeholder} className="input-class" {...field} />
            </FormControl>
            <FormMessage className="form-message mt-2" />
          </div>
        </div>
      )}
    />
  )
}

export default CustomInput
