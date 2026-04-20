import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { requestForgotPasswordOtpApi, resetForgotPasswordApi } from "@/features/auth/api";
import { getApiErrorMessage } from "@/shared/api/client";
import { changeMyPasswordApi } from "@/features/profile/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/shared/ui/input-otp";

type ModalMode = "change" | "forgot";
type ForgotStep = "requestOtp" | "verifyOtp" | "success";
const OTP_VALIDITY_MESSAGE = "OTP is valid for 5 minutes.";
const FORGOT_PASSWORD_REQUEST_MESSAGE =
  "If this email belongs to an active account with password sign-in, a reset code has been sent.";

interface ProfileSecurityModalProps {
  open: boolean;
  mode: ModalMode;
  email: string;
  supportsLocalPassword: boolean;
  allowForgotEmailEditing?: boolean;
  onClose: () => void;
}

const emailSchema = z.string().trim().email("Enter a valid email address");

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    verifyPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.verifyPassword, {
    message: "Passwords do not match",
    path: ["verifyPassword"],
  });

const forgotPasswordSchema = z
  .object({
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d{6}$/, "OTP must be numeric"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    verifyPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.verifyPassword, {
    message: "Passwords do not match",
    path: ["verifyPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ProfileSecurityModal({
  open,
  mode,
  email,
  supportsLocalPassword,
  allowForgotEmailEditing = false,
  onClose,
}: ProfileSecurityModalProps) {
  const [forgotStep, setForgotStep] = useState<ForgotStep>("requestOtp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotVerifyPassword, setShowForgotVerifyPassword] = useState(false);

  const changeForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      verifyPassword: "",
    },
  });

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      verifyPassword: "",
    },
  });

  useEffect(() => {
    if (!open) {
      changeForm.reset();
      forgotForm.reset();
      setForgotStep("requestOtp");
      setIsSubmitting(false);
      setForgotEmail(email);
      setForgotEmailError("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowVerifyPassword(false);
      setShowForgotNewPassword(false);
      setShowForgotVerifyPassword(false);
    }
  }, [changeForm, email, forgotForm, open]);

  useEffect(() => {
    changeForm.reset();
    forgotForm.reset();
    setForgotStep("requestOtp");
    setIsSubmitting(false);
    setForgotEmail(email);
    setForgotEmailError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowVerifyPassword(false);
    setShowForgotNewPassword(false);
    setShowForgotVerifyPassword(false);
  }, [changeForm, email, forgotForm, mode]);

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-4 text-sm font-bold text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-orange-600";
  const labelClass =
    "ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";
  const errorClass = "ml-1 mt-1 text-[10px] font-medium text-red-500";
  const passwordInputClass = `${inputClass} pr-14`;
  const passwordToggleClass =
    "absolute inset-y-0 right-4 flex items-center text-slate-500 transition-colors hover:text-slate-200";
  const primaryBtnClass =
    "w-full rounded-2xl bg-button-gradient px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.3)] disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryBtnClass =
    "rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white";

  const resolveForgotEmail = () => {
    const result = emailSchema.safeParse(allowForgotEmailEditing ? forgotEmail : email);
    if (!result.success) {
      setForgotEmailError(result.error.issues[0]?.message ?? "Enter a valid email address");
      return null;
    }

    setForgotEmail(result.data);
    setForgotEmailError("");
    return result.data;
  };

  const handleChangePasswordSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsSubmitting(true);
      await changeMyPasswordApi({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully");
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    const targetEmail = resolveForgotEmail();
    if (!targetEmail) {
      return;
    }

    try {
      setIsSubmitting(true);
      await requestForgotPasswordOtpApi({ email: targetEmail });
      toast.success(FORGOT_PASSWORD_REQUEST_MESSAGE);
      setForgotStep("verifyOtp");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send OTP"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    const targetEmail = resolveForgotEmail();
    if (!targetEmail) {
      return;
    }

    try {
      setIsSubmitting(true);
      await requestForgotPasswordOtpApi({ email: targetEmail });
      toast.success(FORGOT_PASSWORD_REQUEST_MESSAGE);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resend OTP"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    const targetEmail = resolveForgotEmail();
    if (!targetEmail) {
      setForgotStep("requestOtp");
      return;
    }

    try {
      setIsSubmitting(true);
      await resetForgotPasswordApi({
        email: targetEmail,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      setForgotStep("success");
      toast.success("Password reset successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reset password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUnavailable = () => (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-400">
        This account does not support local email/password security actions.
      </p>
      <button type="button" onClick={onClose} className={secondaryBtnClass}>
        Close
      </button>
    </div>
  );

  const renderChangePassword = () => (
    <form
      onSubmit={changeForm.handleSubmit(handleChangePasswordSubmit)}
      className="space-y-6"
    >
      <div className="space-y-2">
        <label className={labelClass}>Current Password</label>
        <div className="relative">
          <input
            type={showCurrentPassword ? "text" : "password"}
            {...changeForm.register("currentPassword")}
            className={passwordInputClass}
            placeholder="Enter current password"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((current) => !current)}
            className={passwordToggleClass}
            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {changeForm.formState.errors.currentPassword && (
          <p className={errorClass}>
            {changeForm.formState.errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>New Password</label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            {...changeForm.register("newPassword")}
            className={passwordInputClass}
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((current) => !current)}
            className={passwordToggleClass}
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {changeForm.formState.errors.newPassword && (
          <p className={errorClass}>
            {changeForm.formState.errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Verify Password</label>
        <div className="relative">
          <input
            type={showVerifyPassword ? "text" : "password"}
            {...changeForm.register("verifyPassword")}
            className={passwordInputClass}
            placeholder="Re-enter new password"
          />
          <button
            type="button"
            onClick={() => setShowVerifyPassword((current) => !current)}
            className={passwordToggleClass}
            aria-label={showVerifyPassword ? "Hide verify password" : "Show verify password"}
          >
            {showVerifyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {changeForm.formState.errors.verifyPassword && (
          <p className={errorClass}>
            {changeForm.formState.errors.verifyPassword.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className={primaryBtnClass}>
        {isSubmitting ? "Changing..." : "Change Password"}
      </button>
    </form>
  );

  const renderForgotPassword = () => {
    if (forgotStep === "requestOtp") {
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            We will send a one-time password to your email address if it is tied to an active password-based account.
          </p>
          {allowForgotEmailEditing ? (
            <div className="space-y-2">
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(event) => {
                  setForgotEmail(event.target.value);
                  setForgotEmailError("");
                }}
                className={inputClass}
                placeholder="Enter your account email"
              />
              {forgotEmailError ? <p className={errorClass}>{forgotEmailError}</p> : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-4">
              <p className="text-sm font-bold text-orange-500">{email}</p>
            </div>
          )}
          <p className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-orange-200">
            Check your inbox and spam folder for the 6-digit code. {OTP_VALIDITY_MESSAGE}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            For security, we do not confirm whether an email is registered.
          </p>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSubmitting}
            className={primaryBtnClass}
          >
            {isSubmitting ? "Sending..." : "Send OTP"}
          </button>
        </div>
      );
    }

    if (forgotStep === "verifyOtp") {
      return (
        <form
          onSubmit={forgotForm.handleSubmit(handleForgotPasswordSubmit)}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Email</p>
            <p className="mt-1 text-sm font-bold text-orange-500">{forgotEmail}</p>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Enter OTP</label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={forgotForm.watch("otp")}
                onChange={(value) => forgotForm.setValue("otp", value, { shouldValidate: true })}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-12 rounded-l-xl border-white/10 bg-[#0a0a0a] text-white" />
                  <InputOTPSlot index={1} className="h-14 w-12 border-white/10 bg-[#0a0a0a] text-white" />
                  <InputOTPSlot index={2} className="h-14 w-12 border-white/10 bg-[#0a0a0a] text-white" />
                  <InputOTPSlot index={3} className="h-14 w-12 border-white/10 bg-[#0a0a0a] text-white" />
                  <InputOTPSlot index={4} className="h-14 w-12 border-white/10 bg-[#0a0a0a] text-white" />
                  <InputOTPSlot index={5} className="h-14 w-12 rounded-r-xl border-white/10 bg-[#0a0a0a] text-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {forgotForm.formState.errors.otp && (
              <p className={`${errorClass} text-center`}>
                {forgotForm.formState.errors.otp.message}
              </p>
            )}
            <p className="text-center text-[11px] text-slate-400">
              {OTP_VALIDITY_MESSAGE} If it expires, request a new OTP.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting}
              className="text-[10px] font-bold uppercase tracking-widest text-orange-500 transition-colors hover:text-orange-400 disabled:opacity-60"
            >
              Resend OTP
            </button>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>New Password</label>
            <div className="relative">
              <input
                type={showForgotNewPassword ? "text" : "password"}
                {...forgotForm.register("newPassword")}
                className={passwordInputClass}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowForgotNewPassword((current) => !current)}
                className={passwordToggleClass}
                aria-label={showForgotNewPassword ? "Hide new password" : "Show new password"}
              >
                {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {forgotForm.formState.errors.newPassword && (
              <p className={errorClass}>
                {forgotForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Verify Password</label>
            <div className="relative">
              <input
                type={showForgotVerifyPassword ? "text" : "password"}
                {...forgotForm.register("verifyPassword")}
                className={passwordInputClass}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowForgotVerifyPassword((current) => !current)}
                className={passwordToggleClass}
                aria-label={showForgotVerifyPassword ? "Hide verify password" : "Show verify password"}
              >
                {showForgotVerifyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {forgotForm.formState.errors.verifyPassword && (
              <p className={errorClass}>
                {forgotForm.formState.errors.verifyPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryBtnClass}
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      );
    }

    return (
      <div className="space-y-6 py-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black uppercase tracking-wide text-white">
            Password Reset
          </h3>
          <p className="text-sm text-slate-400">
            Your password has been reset. You can now use the new password to log in.
          </p>
        </div>
        <button type="button" onClick={onClose} className={secondaryBtnClass}>
          Done
        </button>
      </div>
    );
  };

  const getTitle = () => {
    if (mode === "change") return "Change Password";
    if (forgotStep === "requestOtp") return "Forgot Password";
    if (forgotStep === "verifyOtp") return "Verify OTP";
    return "Password Reset";
  };

  const getDescription = () => {
    if (!supportsLocalPassword) {
      return "Local password management is unavailable for this account.";
    }
    if (mode === "change") {
      return "Enter your current password and choose a new secure password.";
    }
    if (forgotStep === "requestOtp") {
      return "Reset your password via email verification.";
    }
    if (forgotStep === "verifyOtp") {
      return "Enter the 6-digit code sent to your email before it expires.";
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md rounded-[2rem] border border-white/10 bg-[#0d0d0d] p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-black uppercase tracking-wider text-white">
            {getTitle()}
          </DialogTitle>
          {getDescription() && (
            <DialogDescription className="text-sm text-slate-400">
              {getDescription()}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-4">
          {!supportsLocalPassword
            ? renderUnavailable()
            : mode === "change"
              ? renderChangePassword()
              : renderForgotPassword()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
