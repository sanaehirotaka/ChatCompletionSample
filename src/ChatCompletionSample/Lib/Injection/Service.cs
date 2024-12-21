using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Reflection;

namespace ChatCompletion.Lib.Injection;

public static class AutoConfigExtensions
{
    public static IServiceCollection AutoConfig(this IServiceCollection services, Assembly assembly)
    {
        foreach (Type type in assembly.GetExportedTypes().Where(type => !type.IsInterface && !type.IsAbstract))
        {
            if (type.GetCustomAttribute(typeof(InjectionTargetsAttribute), true) is InjectionTargetsAttribute attribute)
            {
                var serviceType = type;
                var implType = ((IList<Type>)[.. type.GetInterfaces(), type.BaseType!, type]).First(type => type.GetCustomAttribute(typeof(InjectionTargetsAttribute)) != null);
                services.Replace(new(serviceType, implType, attribute.ServiceLifetime));
            }
        }
        return services;
    }
}
