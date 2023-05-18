import * as React from 'react';

// Create interface extending SVGProps
export interface TablerIconsProps extends Partial<Omit<React.SVGProps<SVGSVGElement>, 'stroke'>> {
    size?: number,
    stroke?: number
}

export const IconMouseRightClick = (props: TablerIconsProps) => {
    const { color, size, style } = props;
    return (<svg width={size} height={size} style={style} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 9C5.5 5.41015 8.41015 2.5 12 2.5H24C27.5899 2.5 30.5 5.41015 30.5 9V21C30.5 27.9036 24.9036 33.5 18 33.5C11.0964 33.5 5.5 27.9036 5.5 21V9Z" stroke={color} stroke-width="3" />
        <path d="M7 15H29.5" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="18" y="4" width="11" height="10" fill={color} />
    </svg>);
};


export const IconGitBranchChecked = (props: TablerIconsProps) => {
    const { color, size, style } = props;
    return (<svg width={size} height={size} style={style} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12L9 24" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M27 14V14C27 16.599 24.8931 18.7059 22.2941 18.7059H14.2941C11.3703 18.7059 9 21.0761 9 24V24" stroke={color} stroke-width="3" />
        <path d="M27 13.5C29.4853 13.5 31.5 11.4853 31.5 9C31.5 6.51472 29.4853 4.5 27 4.5C24.5147 4.5 22.5 6.51472 22.5 9C22.5 11.4853 24.5147 13.5 27 13.5Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 34C11.4853 34 13.5 31.9853 13.5 29.5C13.5 27.0147 11.4853 25 9 25C6.51472 25 4.5 27.0147 4.5 29.5C4.5 31.9853 6.51472 34 9 34Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 11C11.4853 11 13.5 8.98528 13.5 6.5C13.5 4.01472 11.4853 2 9 2C6.51472 2 4.5 4.01472 4.5 6.5C4.5 8.98528 6.51472 11 9 11Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M21 28L25.5 32.5L34 24" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>);
};


export const IconGitBranch = (props: TablerIconsProps) => {
    const { color, size, style } = props;
    return (<svg width={size} height={size} style={style} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12L9 24" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M27 14V14C27 16.599 24.8931 18.7059 22.2941 18.7059H14.2941C11.3703 18.7059 9 21.0761 9 24V24" stroke={color} stroke-width="3" />
        <path d="M27 13.5C29.4853 13.5 31.5 11.4853 31.5 9C31.5 6.51472 29.4853 4.5 27 4.5C24.5147 4.5 22.5 6.51472 22.5 9C22.5 11.4853 24.5147 13.5 27 13.5Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 34C11.4853 34 13.5 31.9853 13.5 29.5C13.5 27.0147 11.4853 25 9 25C6.51472 25 4.5 27.0147 4.5 29.5C4.5 31.9853 6.51472 34 9 34Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9 11C11.4853 11 13.5 8.98528 13.5 6.5C13.5 4.01472 11.4853 2 9 2C6.51472 2 4.5 4.01472 4.5 6.5C4.5 8.98528 6.51472 11 9 11Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>);
};

export const IconShellCommand = (props: TablerIconsProps) => {
    const { color, size, style } = props;
    return (<svg width={size} height={size} style={style} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28.5 5.5H7.5C5.84315 5.5 4.5 6.7934 4.5 8.38889V28.6111C4.5 30.2066 5.84315 31.5 7.5 31.5H28.5C30.1569 31.5 31.5 30.2066 31.5 28.6111V8.38889C31.5 6.7934 30.1569 5.5 28.5 5.5Z" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 24L15 21L12 18" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5.5 11H31" stroke={color} stroke-width="3" />
        <path d="M20 24L24 24" stroke={color} stroke-width="3" stroke-linecap="round" />
    </svg>);
};


export const IconBook = (props: TablerIconsProps) => {
    const { color, size, style } = props;
    return (<svg width={size} height={size} style={style} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.75 5.25H12C15.3137 5.25 18 7.93628 18 11.25V30.5C18 28.0147 15.9853 27 13.5 27H2.75V5.25Z" stroke={color} stroke-width="3" stroke-linejoin="round" />
        <path d="M33.25 5.25H24C20.6863 5.25 18 7.93628 18 11.25V30.5C18 28.0147 20.0147 27 22.5 27H33.25V5.25Z" stroke={color} stroke-width="3" stroke-linejoin="round" />
        <path d="M8 11L13 11" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M23 11L28 11" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 16L13 16" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M23 16L28 16" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 21L13 21" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M23 21L28 21" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="15" y="26" width="6" height="6" rx="2" fill={color} />
        <path d="M14 29C14.8 29.4 15 29.8333 15 30V26.5H11.5V28.5C12 28.5 13.2 28.6 14 29Z" fill={color} />
        <path d="M22 29C21.2 29.4 21 29.8333 21 30V26.5H24.5V28.5C24 28.5 22.8 28.6 22 29Z" fill={color} />
    </svg>);
};