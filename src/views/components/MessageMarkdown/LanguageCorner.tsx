import React from 'react';

interface LanguageCornerProps {
  language: string;
}
const LanguageCorner: React.FC<LanguageCornerProps> = ({ language }) => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0 }}>
        {language && (
            <div style={{
                backgroundColor: '#333',
                color: '#fff',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.2rem',
                fontSize: '0.8rem',
            }}>
                {language}
            </div>
        )}
    </div>
  );
};

export default LanguageCorner;