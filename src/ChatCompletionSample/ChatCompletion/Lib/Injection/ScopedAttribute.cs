namespace ChatCompletion.Lib.Injection;

public class ScopedAttribute : InjectionTargetsAttribute
{
    public ScopedAttribute() : base(ServiceLifetime.Scoped)
    {
    }
}
