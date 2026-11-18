import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { updateSessionUser } from "../../auth/session";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { DetailList } from "../../components/DetailList";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { PasswordField } from "../../components/PasswordField";
import { TextField } from "../../components/TextField";
import { useToast } from "../../components/Toast";
import { getProfile, updateProfile, type Me, type ProfileUpdateRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { displayValue } from "../../lib/format";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { emailChanged, PROFILE_FORM_FIELDS, profileSchema, profileToFormValues, toProfileRequest } from "./schema";

const TITLE = "Mi perfil";
const PROFILE_QUERY_KEY = ["profile"] as const;

/**
 * Mi perfil (sección 8.6): vista con usuario, DNI, nombres, apellidos, correo, celular, rol y último acceso; "Editar"
 * abre el formulario en la misma pantalla (nombres, apellidos, correo y celular). Si cambia el correo aparece
 * "Contraseña actual" (obligatoria).
 */
export function ProfilePage() {
  useDocumentTitle(TITLE);
  const query = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: async () => unwrap(await getProfile()) });
  const [editing, setEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const focusEditRef = useRef(false);

  // Al cerrar el formulario, el foco vuelve a "Editar" (no se pierde en el documento).
  useEffect(() => {
    if (!editing && focusEditRef.current) {
      focusEditRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  const closeForm = () => {
    focusEditRef.current = true;
    setEditing(false);
  };

  let content;
  if (query.isError) content = <ErrorState onRetry={() => void query.refetch()} />;
  else if (query.isPending) content = <LoadingState />;
  else if (editing) content = <ProfileForm profile={query.data} onDone={closeForm} />;
  else {
    const me = query.data;
    content = (
      <div className="flex flex-col gap-6">
        <DetailList
          items={[
            { label: "Usuario", value: me.username },
            { label: "DNI", value: me.dni },
            { label: "Nombres", value: me.firstNames },
            { label: "Apellidos", value: me.lastNames },
            { label: "Correo", value: me.email },
            { label: "Celular", value: displayValue(me.phone) },
            { label: "Rol", value: me.role.name },
            { label: "Último acceso", value: formatDateTime(me.lastLoginAt) },
          ]}
        />
        <Button ref={editButtonRef} variant="secondary" className="self-start" onClick={() => setEditing(true)}>
          Editar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLE} />
      <div className="rounded-lg bg-white p-6 shadow-sm">{content}</div>
    </div>
  );
}

function ProfileForm({ profile, onDone }: { profile: Me; onDone: () => void }) {
  const client = useQueryClient();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => profileSchema(profile.email), [profile.email]);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: profileToFormValues(profile) });
  const { errors } = form.formState;
  const email = useWatch({ control: form.control, name: "email" });
  const askPassword = emailChanged(email, profile.email);

  const mutation = useMutation({
    mutationFn: async (body: ProfileUpdateRequest) => unwrap(await updateProfile(body)),
    onSuccess: (me) => {
      client.setQueryData(PROFILE_QUERY_KEY, me);
      // `PATCH /profile` responde `Me`: el nombre de la cabecera se actualiza sin otra consulta.
      updateSessionUser(client, me);
      toast.show("Los cambios se guardaron correctamente.", "success");
      onDone();
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) return;
      const fieldError = failure.status === 409 || failure.status === 422;
      if (!(fieldError && applyFieldErrors(form.setError, failure, PROFILE_FORM_FIELDS))) setFormError(failureMessage(failure));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(toProfileRequest(values, profile.email));
  });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      <p className="text-sm text-slate-700">* Campo obligatorio</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nombres" requiredMark autoComplete="given-name" error={errors.firstNames?.message} {...form.register("firstNames")} />
        <TextField label="Apellidos" requiredMark autoComplete="family-name" error={errors.lastNames?.message} {...form.register("lastNames")} />
        <TextField
          label="Correo"
          type="email"
          requiredMark
          autoComplete="email"
          spellCheck={false}
          error={errors.email?.message}
          {...form.register("email")}
        />
        <TextField label="Celular" type="tel" autoComplete="tel-national" error={errors.phone?.message} {...form.register("phone")} />
        {askPassword && (
          <PasswordField
            label="Contraseña actual"
            requiredMark
            hint="Para cambiar tu correo, ingresa tu contraseña actual."
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
        )}
      </div>
      <Alert variant="error">{formError}</Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={mutation.isPending} loadingText="Guardando...">
          Guardar
        </Button>
        <Button variant="secondary" disabled={mutation.isPending} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
