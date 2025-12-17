import React, { FC } from 'react';
import { IBackButtonProps } from './interface';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// import { Container } from './styles';

const BackButton: FC<Partial<IBackButtonProps>> = (props) => {
    const router = useRouter();
    const handleRedirect = () => {
        if (props.link) {
            router.push(props.link);
        } else {
            router.back();
        }


    }

  return <div className='d-flex align-items-center gap-2 align-self-start' onClick={handleRedirect}>
    <Image src="/assets/icons/chevron-right.png" alt="logo" width={18} height={22} style={{
        transform: 'rotate(180deg)',
        marginTop: '12px',
        filter: "brightness(0) invert(1) sepia(1) saturate(0) hue-rotate(0deg)"
    }} />
    <div onClick={props?.onClick} style={{ marginTop: 12 }}>
      {props.label ?? "Voltar"}
    </div>
  </div>;
}

export default BackButton;