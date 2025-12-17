import React, { FC } from 'react';
import { IInputProps } from './interface';

const Input: FC<IInputProps> = (props) => {
  return <input {...props} className='form-control form-control-lg input-form' />;
}

export default Input;