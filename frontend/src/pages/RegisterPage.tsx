import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type Program = {
  id: number
  code: string
  name: string
  description: string
  is_active: boolean
}

type LocalChurch = {
  id: number
  name: string
  code: string
  description: string | null
  parish: {
    id: number
    name: string
    deanery: {
      id: number
      name: string
    } | null
  } | null
}

type FieldOption = {
  value: string
  label: string
}

type ProgramField = {
  id: number
  field_key: string
  label: string
  field_type: string
  is_required: boolean
  options?: FieldOption[] | null
  validation_rules?: string[] | null
  display_order: number
}

type ProgramFieldsResponse = {
  program: {
    id: number
    code: string
    name: string
  }
  fields: ProgramField[]
}

type ApiErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? 'http://localhost:8001' : window.location.origin
)

const initialFormState = () => ({
  full_name: '',
  username: '',
  phone: '',
  email: '',
  gender: '',
  dob: '',
  local_church_id: '',
  password: '',
  password_confirmation: '',
  preferred_activity: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_notes: '',
  consent: false,
})

export default function RegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawProgramId = Number(searchParams.get('programId'))
  const programId = Number.isFinite(rawProgramId) && rawProgramId > 0 ? rawProgramId : 0

  const [programs, setPrograms] = useState<Program[]>([])
  const [localChurches, setLocalChurches] = useState<LocalChurch[]>([])
  const [programData, setProgramData] = useState<ProgramFieldsResponse | null>(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingFields, setLoadingFields] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() => initialFormState())

  const selectedProgram = useMemo(
    () => programs.find((program) => Number(program.id) === Number(programId)) ?? null,
    [programId, programs],
  )

  const allFields = useMemo(() => {
    return [...(programData?.fields ?? [])].sort(
      (left, right) => (left.display_order ?? 0) - (right.display_order ?? 0),
    )
  }, [programData])

  useEffect(() => {
    if (!programs.length) {
      return
    }

    const nextProgramId = programs.find((program) => Number(program.id) === Number(programId))
      ? programId
      : programs[0].id

    if (programId !== nextProgramId) {
      setSearchParams({ programId: String(nextProgramId) })
    }
  }, [programId, programs, setSearchParams])

  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      try {
        const [programsResponse, churchesResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/programs`),
          fetch(`${apiBaseUrl}/api/v1/local-churches`),
        ])

        if (!programsResponse.ok || !churchesResponse.ok) {
          throw new Error('Unable to load registration catalog.')
        }

        const [programsJson, churchesJson] = await Promise.all([
          programsResponse.json() as Promise<{ data: Program[] }>,
          churchesResponse.json() as Promise<{ data: LocalChurch[] }>,
        ])

        if (!isMounted) return

        setPrograms(programsJson.data)
        setLocalChurches(churchesJson.data)
      } catch (loadError) {
        if (!isMounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the registration catalog.',
        )
      } finally {
        if (isMounted) {
          setLoadingCatalog(false)
        }
      }
    }

    loadCatalog()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadProgramFields() {
      setLoadingFields(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/programs/${programId}/form-fields`,
        )

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const json = (await response.json()) as ProgramFieldsResponse

        const resolvedProgramId = json.program?.id ?? programId

        if (!isMounted) return

        setProgramData(json)
        if (resolvedProgramId && !searchParams.get('programId')) {
          setSearchParams({ programId: String(resolvedProgramId) })
        }
        setFormValues((current) => ({
          ...initialFormState(),
          ...current,
          full_name: current.full_name ?? '',
          username: current.username ?? '',
          phone: current.phone ?? '',
          email: current.email ?? '',
          local_church_id: current.local_church_id ?? '',
          password: current.password ?? '',
          password_confirmation: current.password_confirmation ?? '',
        }))
      } catch (loadError) {
        if (!isMounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load this program’s form fields.',
        )
      } finally {
        if (isMounted) {
          setLoadingFields(false)
        }
      }
    }

    loadProgramFields()

    return () => {
      isMounted = false
    }
  }, [programId, searchParams, setSearchParams])

  const handleFieldChange = (
    fieldKey: string,
    value: string | boolean,
  ) => {
    setFormValues((current) => ({
      ...current,
      [fieldKey]: value,
    }))
    setError(null)
    setSuccess(null)
  }

  const handleProgramChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProgramId = Number(event.target.value)
    setSearchParams({ programId: String(nextProgramId) })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        full_name: String(formValues.full_name ?? '').trim(),
        username: String(formValues.username ?? '').trim(),
        phone: String(formValues.phone ?? '').trim(),
        email: String(formValues.email ?? '').trim(),
        gender: String(formValues.gender ?? '').trim(),
        dob: String(formValues.dob ?? '').trim(),
        local_church_id: Number(formValues.local_church_id ?? 0),
        program_id: programId,
        password: String(formValues.password ?? ''),
        password_confirmation: String(formValues.password_confirmation ?? ''),
        ...Object.fromEntries(
          allFields.map((field) => [
            field.field_key,
            formValues[field.field_key] ?? (field.field_type === 'checkbox' ? false : ''),
          ]),
        ),
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as
        | ApiErrorResponse
        | null

      if (!response.ok) {
        const validationMessage = body?.errors
          ? Object.values(body.errors).flat().at(0)
          : body?.message

        throw new Error(validationMessage ?? 'Registration could not be completed.')
      }

      setSuccess(
        `Registration submitted successfully for ${selectedProgram?.name ?? 'the selected program'}.`,
      )
      setFormValues(initialFormState())
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Registration could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const challengeWeekSelected = selectedProgram?.code === 'CHALLENGE_WEEK_2026'

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
          >
            <ArrowLeft size={16} />
            Back to programs
          </Link>

          <div className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            Registration
          </div>
        </div>

        <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-lg shadow-sky-100 sm:p-8">
          <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600">
                Program registration
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">
                {selectedProgram?.name ?? 'Program registration'}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {selectedProgram?.description ?? 'Complete your registration details below.'}
              </p>
            </div>

            <label className="w-full max-w-sm">
              <span className="mb-2 block text-sm font-semibold text-slate-600">
                Select program
              </span>
              <select
                value={programId}
                onChange={handleProgramChange}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400"
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(loadingCatalog || loadingFields) && (
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm font-medium text-sky-700">
              <Loader2 className="animate-spin" size={16} />
              Loading registration details...
            </div>
          )}

          {!loadingCatalog && !loadingFields && error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loadingCatalog && !loadingFields && success && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          {!loadingCatalog && !loadingFields && !error && selectedProgram && (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Full name <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={String(formValues.full_name ?? '')}
                    onChange={(event) => handleFieldChange('full_name', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Username <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={String(formValues.username ?? '')}
                    onChange={(event) => handleFieldChange('username', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="Choose a username"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Phone
                  </span>
                  <input
                    type="text"
                    value={String(formValues.phone ?? '')}
                    onChange={(event) => handleFieldChange('phone', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="0712 345 678"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={String(formValues.email ?? '')}
                    onChange={(event) => handleFieldChange('email', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="name@example.com"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Local church <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={String(formValues.local_church_id ?? '')}
                    onChange={(event) => handleFieldChange('local_church_id', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    required
                  >
                    <option value="">Select a local church</option>
                    {localChurches.map((church) => (
                      <option key={church.id} value={church.id}>
                        {church.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="password"
                    value={String(formValues.password ?? '')}
                    onChange={(event) => handleFieldChange('password', event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="Enter password"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Confirm password <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="password"
                    value={String(formValues.password_confirmation ?? '')}
                    onChange={(event) =>
                      handleFieldChange('password_confirmation', event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    placeholder="Re-enter password"
                    required
                  />
                </label>
              </div>

              {allFields.length > 0 && (
                <div className="space-y-6">
                  <div className="border-t border-slate-200 pt-6">
                    <h2 className="text-lg font-black text-slate-900">
                      {challengeWeekSelected
                        ? 'Challenge Week 2026 details'
                        : 'Program-specific details'}
                    </h2>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {allFields.map((field) => {
                      const fieldKey = field.field_key
                      const fieldValue = formValues[fieldKey] ?? ''

                      if (field.field_type === 'checkbox') {
                        return (
                          <label
                            key={field.id}
                            className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(formValues[fieldKey])}
                              onChange={(event) =>
                                handleFieldChange(fieldKey, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              required={field.is_required}
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {field.label}
                              {field.is_required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </span>
                          </label>
                        )
                      }

                      if (field.field_type === 'select') {
                        return (
                          <label key={field.id} className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">
                              {field.label}
                              {field.is_required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </span>
                            <select
                              value={String(fieldValue)}
                              onChange={(event) =>
                                handleFieldChange(fieldKey, event.target.value)
                              }
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                              required={field.is_required}
                            >
                              <option value="">Select an option</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )
                      }

                      if (field.field_type === 'textarea') {
                        return (
                          <label
                            key={field.id}
                            className="flex flex-col gap-2 md:col-span-2"
                          >
                            <span className="text-sm font-semibold text-slate-700">
                              {field.label}
                              {field.is_required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </span>
                            <textarea
                              value={String(fieldValue)}
                              onChange={(event) =>
                                handleFieldChange(fieldKey, event.target.value)
                              }
                              rows={4}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                              placeholder={field.label}
                              required={field.is_required}
                            />
                          </label>
                        )
                      }

                      return (
                        <label key={field.id} className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {field.label}
                            {field.is_required && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </span>
                          <input
                            type={field.field_type === 'date' ? 'date' : 'text'}
                            value={String(fieldValue)}
                            onChange={(event) =>
                              handleFieldChange(fieldKey, event.target.value)
                            }
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                            required={field.is_required}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
