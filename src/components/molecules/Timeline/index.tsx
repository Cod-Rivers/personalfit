import React, { FC } from 'react';

// import { Container } from './styles';

interface ITimelineProps {
    currentStep: number;
    totalSteps: number;
}

const Timeline: FC<ITimelineProps> = ({ currentStep, totalSteps }) => {
    return (
        <div className="d-flex align-items-center">
            {Array.from({ length: totalSteps }).map((_, index) => {
                return (
                    <React.Fragment key={index}>
                        <div
                            className={`rounded-circle p-3 ${
                                index === currentStep ? 'bg-gold' : 'bg-light'
                            }`}
                            style={{
                                border: `3px solid ${
                                    index <= currentStep
                                        ? 'var(--color-gold)'
                                        : 'var(--color-light)'
                                }`,
                                color:
                                    index <= currentStep
                                        ? 'var(--color-gold)'
                                        : 'var(--color-light',
                            }}
                        />
                        {index < totalSteps - 1 && (
                            <div
                                className="flex-grow-1"
                                style={{
                                    height: '3px',
                                    // margin: '20px 0',
                                    backgroundColor: 'var(--color-gold)',
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Timeline;
