import React, { FC } from 'react';
import { IBackButtonProps } from './types';
import { FiChevronLeft } from 'react-icons/fi';
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
    {/* Ícone na cor do texto: o PNG antigo era pintado de branco por filter
        e sumia no tema claro. */}
    <FiChevronLeft size={22} aria-hidden style={{ marginTop: 12, flexShrink: 0 }} />
    <div onClick={props?.onClick} style={{ marginTop: 12 }}>
      {props.label ?? "Voltar"}
    </div>
  </div>;
}

export default BackButton;