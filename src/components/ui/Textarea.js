import React from 'react';
import Input from './Input';

const Textarea = (props) => {
  return (
    <Input
      multiline
      numberOfLines={4}
      {...props}
    />
  );
};

export default Textarea;
