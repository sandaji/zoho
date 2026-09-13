import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with default variant', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
  });

  it('should render with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    
    let button = screen.getByRole('button', { name: /delete/i });
    expect(button).toBeInTheDocument();
    
    rerender(<Button variant="outline">Outline</Button>);
    
    button = screen.getByRole('button', { name: /outline/i });
    expect(button).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    button.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });
});