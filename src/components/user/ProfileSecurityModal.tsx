import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { requestForgotPasswordOtpApi, resetForgotPasswordApi } from "@/api/auth.api";
import { getApiErrorMessage } from "@/api/client";
import { changeMyPasswordApi } from "@/api/profile.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type ModalMode = "change" | "forgot";
type ForgotStep = "requestOtp" | "verifyOtp" | "success";

interface ProfileSecurityModalProps {
  open: boolean;
  mode: ModalMode;
  email: string;
  supportsLocalPassword: boolean;
  onClose: () => void;
}

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
  onClose,
}: ProfileSecurityModalProps) {
  const [forgotStep, setForgotStep] = useState<ForgotStep>("requestOtp");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [changeForm, forgotForm, open]);

  useEffect(() => {
    changeForm.reset();
    forgotForm.reset();
    setForgotStep("requestOtp");
    setIsSubmitting(false);
  }, [changeForm, forgotForm, mode]);

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-4 text-sm font-bold text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-orange-600";
  const labelClass =
    "ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";
  const errorClass = "ml-1 mt-1 text-[10px] font-medium text-red-500";
  const primaryBtnClass =
    "w-full rounded-2xl bg-button-gradient px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.3)] disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryBtnClass =
    "rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-white/10 hover:text-white";

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
    try {
      setIsSubmitting(true);
      await requestForgotPasswordOtpApi({ email });
      toast.success("OTP sent. Use 123456 for the current dummy flow.");
      setForgotStep("verifyOtp");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send OTP"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsSubmitting(true);
      await requestForgotPasswordOtpApi({ email });
      toast.success("OTP resent. Use 123456 for the current dummy flow.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resend OTP"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      await resetForgotPasswordApi({
        email,
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
        <input
          type="password"
          {...changeForm.register("currentPassword")}
          className={inputClass}
          placeholder="Enter current password"
        />
        {changeForm.formState.errors.currentPassword && (
          <p className={errorClass}>
            {changeForm.formState.errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>New Password</label>
        <input
          type="password"
          {...changeForm.register("newPassword")}
          className={inputClass}
          placeholder="Enter new password"
        />
        {changeForm.formState.errors.newPassword && (
          <p className={errorClass}>
            {changeForm.formState.errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Verify Password</label>
        <input
          type="password"
          {...changeForm.register("verifyPassword")}
          className={inputClass}
          placeholder="Re-enter new password"
        />
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
            We will send a one-time password to your registered email address.
          </p>
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-4">
            <p className="text-sm font-bold text-orange-500">{email}</p>
          </div>
          <p className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-orange-200">
            Dummy flow: the current OTP is always `123456`.
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
            <input
              type="password"
              {...forgotForm.register("newPassword")}
              className={inputClass}
              placeholder="Enter new password"
            />
            {forgotForm.formState.errors.newPassword && (
              <p className={errorClass}>
                {forgotForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Verify Password</label>
            <input
              type="password"
              {...forgotForm.register("verifyPassword")}
              className={inputClass}
              placeholder="Re-enter new password"
            />
            {forgotForm.formState.errors.verifyPassword && (
              <p className={errorClass}>
                {forgotForm.formState.errors.verifyPassword.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className={primaryBtnClass}>
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
      return "Enter the 6-digit code sent to your email.";
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
