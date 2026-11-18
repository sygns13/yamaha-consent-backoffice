import type { UseFormReturn } from "react-hook-form";
import { Select } from "../../components/Select";
import { TextField } from "../../components/TextField";
import type { CodeName } from "../../lib/api";
import type { UserFormValues } from "./schema";

const USERNAME_HINT =
  "De 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo. Debe empezar con una letra. No se puede cambiar.";

interface UserFieldsProps {
  form: UseFormReturn<UserFormValues>;
  roles: readonly CodeName[];
  /** Al editar, el usuario se muestra deshabilitado (no se envía). */
  fixedUsername?: string;
  /** Al editar el propio usuario, el rol queda deshabilitado (sección 8.6). */
  roleDisabled?: boolean;
}

/** Campos del formulario de usuario en el orden de la sección 8.6 (textos del Anexo A.2). */
export function UserFields({ form, roles, fixedUsername, roleDisabled = false }: UserFieldsProps) {
  const { errors } = form.formState;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="DNI"
        requiredMark
        inputMode="numeric"
        autoComplete="off"
        error={errors.dni?.message}
        {...form.register("dni")}
      />
      <TextField label="Nombres" requiredMark autoComplete="off" error={errors.firstNames?.message} {...form.register("firstNames")} />
      <TextField label="Apellidos" requiredMark autoComplete="off" error={errors.lastNames?.message} {...form.register("lastNames")} />
      {fixedUsername === undefined ? (
        <TextField
          label="Usuario"
          requiredMark
          hint={USERNAME_HINT}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...form.register("username")}
        />
      ) : (
        <TextField label="Usuario" hint={USERNAME_HINT} value={fixedUsername} disabled readOnly />
      )}
      <TextField
        label="Correo"
        type="email"
        requiredMark
        autoComplete="off"
        spellCheck={false}
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField label="Celular" type="tel" autoComplete="off" error={errors.phone?.message} {...form.register("phone")} />
      <Select
        label="Rol"
        requiredMark
        placeholder="Selecciona"
        options={roles.map((role) => ({ value: role.code, label: role.name }))}
        disabled={roleDisabled}
        error={errors.roleCode?.message}
        {...form.register("roleCode")}
      />
    </div>
  );
}
