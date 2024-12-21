using Microsoft.Extensions.DependencyInjection;

namespace ChatCompletion.Lib.Injection;

[AttributeUsage(AttributeTargets.Class)]
public abstract class InjectionTargetsAttribute(ServiceLifetime lifetime) : Attribute
{
    public ServiceLifetime ServiceLifetime { get; init; } = lifetime;
}
