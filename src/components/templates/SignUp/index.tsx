"use client"
import { useTranslations } from "next-intl";
import React, { FC, FormEvent, useState } from "react";
import Input from "@/components/molecules/Input";
import Image from "next/image";
import Link from "next/link";
import "./styles.css";
import { Api } from "@/app/utils/api";

interface SignUpForm {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    confirm_password: string;
}

const TSignUp: FC = () => {
  const t = useTranslations("SignUpPage");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<SignUpForm>({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        password: "",
        confirm_password: ""
  });

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        mobile: form.phone,
        cpf: form.cpf,
        password: form.password
    }

    try {
        const { data } = await Api.post("/users", payload);

        if (data.error) {
            setError(data.error);
            return;
        }

        window.location.href = "/";
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }

    const handlechange = (e: any) => {
        setForm({...form, [e.target.name]: e.target.value});
    }

  return (
    <div className="login_main_container">
      <div className="login_box">
        <Image src="/assets/images/logo.png" alt="logo" sizes="cover" width={200} height={95}/>
        <h1>{t("title")}</h1>
        <form onSubmit={login} className="w-100 d-flex flex-column gap-4 my-3">
            <Input placeholder={t("nameInput")} name="name" onChange={handlechange} />
            <Input placeholder={t("emailInput")} name="email" onChange={handlechange} />
            <Input placeholder={t("phoneInput")} name="phone" onChange={handlechange} />
            <Input placeholder={t("cpfInput")} name="cpf" onChange={handlechange} />
            <Input placeholder={t("passwordInput")} name="password" type="password" onChange={handlechange} />
            <Input placeholder={t("passwordConfirmInput")} name="confirm_password" onChange={handlechange} />
            <span className="alert-danger">{error}</span>
            {loading && <span className="spinner-border spinner-border-sm"></span>}
            <button className="btn btn-gold">{t("btn.signup")}</button>
        </form>
        <span>Já tem conta? <Link href={`/`}>fazer o login</Link></span>
      </div>
    </div>
  );
};

export default TSignUp;
