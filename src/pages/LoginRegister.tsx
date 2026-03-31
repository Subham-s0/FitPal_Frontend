import { LoginRegisterScreen } from "@/features/auth";

type Props = {
  initialMode?: "login" | "register";
};

const LoginRegister = ({ initialMode }: Props) => (
  <LoginRegisterScreen initialMode={initialMode} />
);

export default LoginRegister;
